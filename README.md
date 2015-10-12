# stylus-autocompile

Auto compile Stylus file on save. Fork of [less-autocompile](https://github.com/lohek/less-autocompile)

Add the parameters on the first line of the Stylus file.

| param | type | description |
| --- | --- | --- |
| out <sup><a href="#note1">1</a></sup> | string | path of css file to create |
| compress <sup><a href="#note2">2</a></sup> | bool | compress css file |
| sourcemap <sup><a href="#note2">2</a></sup> | bool | create a sourcemap for this file |
| nib <sup><a href="#note2">2</a></sup> | bool | enable the use of the nib library in stylus |
| main <sup><a href="#note1">1</a></sup> | string | path to your main stylus file to be compiled |

<sup id="note1"><a href="#note1">1</a></sup> The paths are relative to the stylus file. If both an `out` and a `main` field are defined, both the current file and the main file are compiled and stored in their respective `out`

<sup id="note2"><a href="#note2">2</a></sup> The `compress`, `sourcemap` and `nib` fields don't have any effect when no `out` field is defined.

## Example

main.styl

```stylus
// out: css/style.css, sourcemap: true, compress: true, nib: true

@import "component.styl";
@import "other.styl";
```

component.styl

```stylus
// main: main.styl, out: css/component.css

my-component {
  height: 100px;
  width: 100px;
}
```

other.styl

```stylus
// main: component.styl

other-component {
  height: 50px;
}
```

When saving `main.styl`, `main.styl` will be compiled, compressed and saved as `css/style.css`, along with a sourcemap `css/style.css.map`.

When saving either `component.styl` or `other.styl`, both `main.styl` and `component.styl` will be compiled to `css/style.css` and `css/component.css`, respectively. A sourcemap will also be generated for `main.styl` and saved to `css/style.css.map`.
