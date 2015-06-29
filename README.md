# stylus-autocompile

Auto compile Stylus file on save. Fork of [less-autocompile](https://github.com/lohek/less-autocompile)

Add the parameters on the first line of the Stylus file.

```
out       (string) : path of CSS file to create
compress  (bool)   : compress CSS file
sourcemap (bool)   : create a sourcemap for the file
nib       (bool)   : use and import nib (cross-browser CSS3 mixins)
main      (string) : path to your main Stylus file to be compiled
```

## Example

stylus/main.styl

```sass
// out: ../css/style.css, sourcemap: true, compress: true, nib: true

@import "component/main.styl";
```

stylus/component/main.styl

```sass
// main: ../main.styl

my-component {
  height: 100px;
  width: 100px;
}
```

When saving either `stylus/main.styl` or `stylus.component/main.styl`, `stylus/main.styl` will be compiled and compressed and saved as `css/style.css` along with a sourcemap `css/style.css.map`
