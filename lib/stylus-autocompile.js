'use babel';
import fs from 'fs';
import path from 'path';
import {CompositeDisposable} from 'atom';
import resolve from 'resolve';
import mkdirp from 'mkdirp';
import stylusFallback from 'stylus';
import {initView, deinitView, showView} from './stylus-autocompile-view.js';

export var config = {
  stylusLibPath: {
    description: 'colon-separated list of paths to search for stylus libraries',
    type: 'string',
    default: '/usr/local/lib',
    order: 0,
  },
  statusBarMessageTimeout: {
    description: 'Timeout before the status bar message disappears',
    type: 'integer',
    default: '5000',
    minimum: 0,
    order: 1,
  },
};

var disposable;

export function activate() {
  disposable = new CompositeDisposable(
    atom.commands.add('atom-text-editor', 'core:save', ({currentTarget}) =>
      handleSave(currentTarget)
    )
  );
}

export function deactivate() {
  disposable.dispose();
  disposable = null;
  deinitView();
}

export function consumeStatusBar(statusBar) {
  initView(statusBar);
}

// There are several packages that provide a
// stylus grammar, using different scopeNames.
const getStylusGrammar = (() => {
  var stylusGrammar;

  return function getStylusGrammar() {
    return stylusGrammar || (stylusGrammar = ['source.css.stylus', 'source.stylus'].map((scopeName) =>
      atom.grammars.grammarForScopeName(scopeName)
    ).find(x => x));
  };
})();

function handleSave(textEditorElement) {
  var textEditor;
  if (typeof textEditorElement.getModel != 'function') return;
  textEditor = textEditorElement.getModel();
  if (typeof textEditor.getGrammar != 'function') return;
  if (textEditor.getGrammar() == getStylusGrammar()) {
    compile(textEditor.getText(), textEditor.getURI());
  }
}

function compile(source, inPath) {
  var params = getParams(source, inPath);

  if (params == null) return;

  if (params.main) {
    var mainPath = path.resolve(path.dirname(inPath), `${params.main}`);
    fs.readFile(mainPath, 'utf8', (err, mainSource) => {
      if (err) return atom.notifications.addError(`Error while reading file: ${mainPath}`);
      compile(mainSource, mainPath);
    });
  }

  if (params.out) {
    params.inPath = inPath;
    params.outPath = path.resolve(path.dirname(inPath), `${params.out}`);
    render(source, params);
  }
}

function initRenderer(source, params) {
  var {inPath, outPath, compress, sourcemap, libs} = params;
  var fileDir = path.dirname(path.resolve(inPath));
  return getStylusExecutable(fileDir).then(stylus =>
    stylus(source)
      .set('paths', [fileDir])
      .set('filename', inPath)
      .set('dest', outPath)
      .set('compress', compress)
      .set('sourcemap', sourcemap)
  ).then(renderer =>
    includeLibs(renderer, libs, fileDir)
  );
}

function render(source, params) {
  initRenderer(source, params).then(renderer =>
    renderer.render((error, css) => {
      if (error) return showView('error', error.message, `${error.filename}: ${error.line}`);

      writeFile(css, params.outPath);
      if (renderer.sourcemap)
        writeFile(JSON.stringify(renderer.sourcemap), `${params.outPath}.map`);
    })
  ).catch(error =>
    showView('error', error.message)
  );
}

function getStylusExecutable(basedir) {
  return getModulePath(basedir, 'stylus').then(filename =>
    require(filename)
  ).catch(() =>
    stylusFallback
  );
}

function includeLibs(renderer, libs, basedir) {
  return Promise.all(libs.map(lib =>
    getLibPath(basedir, lib).then(filename =>
      renderer.use(require(filename)())
    )
  )).then(() => renderer);
}

// Try to find library locally in the project
// and, if not found there, searches the paths
// in the stylusLibPath setting.
function getLibPath(basedir, lib) {
  return getModulePath(basedir, lib).then(filename =>
    filename || Promise.all(getStylusLibPaths().map(dir =>
      getModulePath(dir, lib)
    )).then(dirs =>
      dirs.find(dir => dir)
    )
  );
}

// Get the absolute path of the file that is
// loaded when `require(module)` would be
// called from a script inside basedir.
function getModulePath(basedir, module) {
  return new Promise(accept =>
    resolve(module, {basedir}, (error, filename) => accept(filename))
  );
}

function getStylusLibPaths() {
  return atom.config.get('stylus-autocompile.stylusLibPath').split(':');
}

// Write content to file, and add errors
// or success messages to the view in the
// statusbar.
function writeFile(content, filePath) {
  mkdirp(path.dirname(filePath), error => {
    if (error) return showView('error', error.message);

    fs.writeFile(filePath, content, error => {
      if (error) return showView('error', error.message);

      showView('success', getPathInProject(filePath));
    });
  });
}

// Get the path of a file relative to
// the project root.
function getPathInProject(filePath) {
  var projectPath = path.dirname(filePath);
  for (let p of atom.project.getPaths()) {
    if (filePath.match(p)) {
      projectPath = p;
      break;
    }
  }
  var regex = new RegExp(`^${projectPath}(/|\\\\)`);
  return filePath.replace(regex, '');
}

// match the first comment in the file
function getParams(source, inFile) {
  var [, paramString] = source.match(/^\s*\/\/(.*)$/m) || [];
  if (!paramString)
    return {
      out: replacePlaceholders('$1.css', inFile),
      compress: true,
      sourcemap: false,
      libs: []
    };

  paramString = paramString.trim();
  var main = getParam(paramString, 'main');
  var out = replacePlaceholders(getParam(paramString, 'out'), inFile);
  if (!out) return main ? {main} : null;

  var compress = parseBool(getParam(paramString, 'compress', true));
  var sourcemap = parseBool(getParam(paramString, 'sourcemap', true));
  var libs = parseArray(getParam(paramString, 'libs', false));
  return {main, out, compress, sourcemap, libs};
}

function getParam(paramString, key) {
  var regex = new RegExp(`${key}\s*:\s*([^,]+)`);
  var [, value] = paramString.match(regex) || [, ''];
  return value.trim();
}

function parseBool(value) {
  return value == 'false' ?  false : !!value;
}

function parseArray(value) {
  return value.split(/\s/).filter(x => x);
}

// Replace all occurrences of $1 with the basename
// (without extension) of inFile and $2 with the
// extension of inFile.
function replacePlaceholders(outPath, inFile) {
  inFile = path.basename(inFile);
  var extname = path.extname(inFile).substr(1);
  var basename = inFile.substr(0, inFile.length - extname.length - 1);
  return outPath.replace(/\$1/g, basename).replace(/\$2/g, extname);
}
