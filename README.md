# Colophon Desk

## Prologue

A catalogue can say that a manuscript measures so many centimetres and weighs so much, and it stays a line in a ledger until someone lays the book on the desk and opens it. The machines of the 8-bit era are catalogued the same way: a size in a service manual, a photograph in a museum's record.

The [emulator](https://github.com/tulinmola/colophon-emulator) runs them from the inside, and the [player](https://github.com/tulinmola/colophon-player) is where they are read. Here the machine is seen whole: the computer and its monitor standing on a desk, the picture on the glass, the keys going down under the fingers that press them. Every measure it is built from is taken from the machine itself or from a source that can be named, and says which.

## Building

Node and npm are the whole toolchain.

```sh
npm install
npm start            # serve the page
npm run build        # write the site to dist/
npm run models:build # write the models and their prints to src/assets/
npm run check        # formatting and linting
npm run test:e2e     # the page driven in a browser
```

## License

MIT, like the rest of Colophon. The fonts in `tools/fonts/` are TeX Gyre Heros 2.004 by Bogusław Jackowski and Janusz M. Nowacki, its Vietnamese characters by Hàn Thế Thành, shipped unmodified under the GUST Font License; that licence, the family's manifest and its readme stand beside them. They are the builder's, not the page's: the prints are rendered from them, and nothing of them reaches the browser.
