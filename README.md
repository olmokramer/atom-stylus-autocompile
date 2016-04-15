# stylus-autocompile

Auto compile Stylus file on save. Fork of [less-autocompile](https://github.com/lohek/less-autocompile)

Add the parameters on the first line of the Stylus file.

| param | type | description |
| --- | --- | --- |
| out <sup><a id="ref-1" href="#note-1">1</a> <a id="ref-2" href="#note-2">2</a></sup> | string | path of css file to create |
| compress <sup><a id="ref-3" href="#note-3">3</a></sup> | bool | compress css file |
| sourcemap <sup><a href="#note-3">3</a></sup> | bool | create a sourcemap for this file |
| libs <sup><a href="#note-3">3</a></sup> | array | space-separated list of libraries to include. the specified libraries must be installed in the (parent) directory of the stylus file |
| main <sup><a href="#note-1">1</a></sup> | string | path to the main stylus file to be compiled |

<sup><a id="note-1" href="#ref-1">1</a></sup> The paths are relative to the stylus file. If both an `out` and a `main` field are specified, both the current file and the main file are compiled and stored in their respective `out`

<sup><a id="note-2" href="#ref-2">2</a></sup> The output filename may contain `$1` or `$2`, which will be replaced by the input basename and extension, respectively. So a file named `in.styl` and is configured with `# out: $1.$2.css` will compile to `in.styl.css`.

<sup><a id="note-3" href="#ref-3">3</a></sup> The `compress`, `sourcemap` and `libs` fields don't have any effect when no `out` field is specified.

If stylus is installed locally in the project of the current file, that version will be used. Otherwise Stylus autocompile falls back to a bundled version of stylus.

## Example

main.styl

```stylus
// out: css/style.css, sourcemap: true, compress: true, libs: nib

@import "component.styl";
@import "other.styl";
@import "nib/gradients";
```

When saving `main.styl`, `main.styl` will be compiled, compressed and saved as `css/style.css` (relative to `main.styl`), along with a sourcemap `css/style.css.map`. The `nib` library is available for `@import`s in `main.styl`.

component.styl

```stylus
// main: main.styl, out: css/component.css

my-component {
  height: 100px;
  width: 100px;
}
```

When saving `component.styl`, both `main.styl` and `component.styl` are compiled to `css/style.css` and `css/component.css`, respectively.

other.styl

```stylus
// main: component.styl

other-component {
  height: 50px;
}
```

When `other.styl` is saved `main.styl` and `component.styl` will be compiled to `css/style.css` and `css/component.css`, respectively.
