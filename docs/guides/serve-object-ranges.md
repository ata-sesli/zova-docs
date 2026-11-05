import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Serve objects with range requests

Video players, PDF viewers, and resumable downloads ask for byte ranges such as `Range: bytes=0-1023` instead of a whole file. A Zova **seekable reader** answers those requests by reading only the chunks that cover the range, so serving the last megabyte of a large object does not load the rest of it.

This guide serves documents from the [tutorial](../get-started/first-database.md) library over HTTP. Each request looks up a row, opens a seekable reader for its object, and answers with `200 OK` for a whole file, `206 Partial Content` for a satisfiable range, or `416 Range Not Satisfiable` when the range starts past the end.

## Open the database read-only

A server that only serves objects should open the file read-only, so a bug in a handler cannot change the library.

## Write the handler

<Tabs groupId="programming-languages" defaultValue="javascript">
  <TabItem value="javascript" label="JavaScript">

```js title="serve.mjs"
import { createServer } from "node:http";
import { Database, Step } from "zova-js";

const db = Database.open("library.zova", { readOnly: true });

function lookup(id) {
  const query = db.prepare("select title, media_type, object_id from documents where id = ?1");
  try {
    query.bindInteger(1, BigInt(id));
    if (query.step() !== Step.Row) return null;
    return { title: query.columnText(0), mediaType: query.columnText(1), objectId: query.columnBlob(2) };
  } finally {
    query.close();
  }
}

// Parse one "bytes=start-end", "bytes=start-", or "bytes=-suffix" range.
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? "");
  if (!match || (match[1] === "" && match[2] === "")) return null;
  let start, end;
  if (match[1] === "") {
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  return start <= end && start < size ? { start, end } : "unsatisfiable";
}

createServer((request, response) => {
  const id = /^\/documents\/(\d+)$/.exec(request.url ?? "")?.[1];
  const document = id && lookup(id);
  if (!document) {
    response.writeHead(404).end();
    return;
  }

  const reader = db.objectSeekableReader(document.objectId);
  try {
    const size = Number(reader.size);
    const range = request.headers.range ? parseRange(request.headers.range, size) : null;
    if (range === "unsatisfiable") {
      response.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
      return;
    }
    const { start, end } = range ?? { start: 0, end: size - 1 };
    reader.seek(start);
    const body = reader.read(end - start + 1);
    response.writeHead(range ? 206 : 200, {
      "Accept-Ranges": "bytes",
      "Content-Type": document.mediaType,
      "Content-Length": body.byteLength,
      ...(range && { "Content-Range": `bytes ${start}-${end}/${size}` }),
    });
    response.end(body);
  } finally {
    reader.close();
  }
}).listen(8080, "127.0.0.1");
```

Node's `http` module does not parse `Range` headers, so `parseRange` handles the three single-range forms. The reader's `size` is a `bigint`; this example converts it to a number, which is exact for objects below 8 PiB. A request for several ranges at once falls back to a full `200` response here.

  </TabItem>
  <TabItem value="go" label="Go">

```go title="serve/main.go"
package main

import (
	"log"
	"net/http"
	"strconv"
	"time"

	zova "github.com/ata-sesli/zova/bindings/go"
)

func main() {
	db, err := zova.OpenWithOptions("library.zova", zova.OpenOptions{ReadOnly: true})
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	http.HandleFunc("GET /documents/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		title, mediaType, objectID, found, err := lookup(db, id)
		if err != nil {
			http.Error(w, "lookup failed", http.StatusInternalServerError)
			return
		}
		if !found {
			http.NotFound(w, r)
			return
		}

		reader, err := db.ObjectSeekableReader(objectID)
		if err != nil {
			http.Error(w, "object unavailable", http.StatusInternalServerError)
			return
		}
		defer reader.Close()

		w.Header().Set("Content-Type", mediaType)
		// ServeContent answers Range and If-Range requests by seeking the reader.
		http.ServeContent(w, r, title, time.Time{}, reader)
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:8080", nil))
}

func lookup(db *zova.DB, id int64) (title, mediaType string, objectID zova.ObjectID, found bool, err error) {
	query, err := db.Prepare("select title, media_type, object_id from documents where id = ?1")
	if err != nil {
		return
	}
	defer query.Close()
	if err = query.BindInt64(1, id); err != nil {
		return
	}
	step, err := query.Step()
	if err != nil || step != zova.StepRow {
		return
	}
	if title, _, err = query.ColumnText(0); err != nil {
		return
	}
	if mediaType, _, err = query.ColumnText(1); err != nil {
		return
	}
	blob, _, err := query.ColumnBlob(2)
	if err != nil {
		return
	}
	copy(objectID[:], blob)
	return title, mediaType, objectID, true, nil
}
```

`ObjectSeekableReader` implements `io.ReadSeeker`, so `http.ServeContent` handles `Range`, `If-Range`, `416` responses, and multi-range requests itself.

  </TabItem>
</Tabs>

## Try it

Run the server next to `library.zova`, then request the first five bytes of document 1:

```sh
curl -i -r 0-4 http://127.0.0.1:8080/documents/1
```

```text
HTTP/1.1 206 Partial Content
Accept-Ranges: bytes
Content-Length: 5
Content-Range: bytes 0-4/37
Content-Type: text/plain

Notes
```

A request without `-r` returns the whole object with `200 OK`, an unknown ID returns `404`, and `-r 500-600` returns `416` because document 1 is 37 bytes long.

## Other bindings

- **Rust:** `object_seekable_reader` returns a reader that implements `std::io::Read` and `std::io::Seek`. `object_seekable_reader_owned` returns one that does not borrow the database, and `SharedDatabase` returns a `SharedObjectSeekableReader`.
- **Python:** `object_seekable_reader` returns a file-like object with `read`, `readinto`, `seek`, and `tell` that works as a context manager. Seek to the range start and read `end - start + 1` bytes.
- **Zig and C:** `Database.objectSeekableReader`; `zova_object_seekable_reader_create`, `_read`, `_seek`, and `_destroy`.

For one read at a known offset, a range read such as `read_object_range` fills a buffer without opening a reader. See [Objects](../core/objects.md) for chunking and verification.

## Things to watch

- Close each reader when the response ends. A reader holds no read transaction between calls, but it keeps its current chunk in memory until it is closed.
- Object IDs are content hashes, so they make strong `ETag` values: the bytes behind an ID never change.
- A seekable reader verifies each chunk it returns, not the whole-object hash. Read the complete object when a client needs the full identity checked.
- Range responses are only as trustworthy as the lookup that chose the object. Keep authorization in the SQL query that maps a request to an object ID.
