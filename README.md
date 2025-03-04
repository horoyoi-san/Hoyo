## Web

Website: [srtools.pages.dev](https://srtools.pages.dev)

## Compiling

1. Compile with `./gradlew jar` from your system terminal.
2. Place the compiled jar file (`sr-tools.jar`) into your LunarCore plugins folder.

### HTTP Endpoint for website connection
```
POST /sr-tools
```

### HTTP Endpoint for exporting to `freesr-data.json`
```
GET /sr-tools-export?uid=YOUR_UID
```
