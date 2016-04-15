# stylus-autocompile

Auto compile Stylus file on save. Fork of [less-autocompile](https://github.com/lohek/less-autocompile)

Add the parameters on the first line of the Stylus file.

| param | type | description |
| --- | --- | --- |
| out <sup><a href="#note1">1</a></sup> | string | path of css file to create |
| compress <sup><a href="#note2">2</a></sup> | bool | compress css file |
| sourcemap <sup><a href="#note2">2</a></sup> | bool | create a sourcemap for this file |
| libs <sup><a href="#note2">2</a></sup> | array | space-separated list of libraries to include. the specified libraries must be installed in the (parent) directory of the stylus file |
| main <sup><a href="#note1">1</a></sup> | string | path to the main stylus file to be compiled |

<sup id="note1"><a href="#note1">1</a></sup> The paths are relative to the stylus file. If both an `out` and a `main` field are specified, both the current file and the main file are compiled and stored in their respective `out`

<sup id="note2"><a href="#note2">2</a></sup> The `compress`, `sourcemap` and `libs` fields don't have any effect when no `out` field is specified.

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
