'use babel';
import fs from 'fs';
import path from 'path';
import {CompositeDisposable} from 'atom';
import resolve from 'resolve';
import mkdirp from 'mkdirp';
import stylusFallback from 'stylus';
import {initView, deinitView, showView} from './stylus-autocompile-view.js';

export var config = {
  statusBarMessageTimeout: {
    description: 'Timeout before the status bar message disappears',
    type: 'integer',
    default: '5000',
    minimum: 0,
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

const stylusGrammar = ['source.css.stylus', 'source.stylus']
  .map((scopeName) => atom.grammars.grammarForScopeName(scopeName))
  .find(x => x);

function handleSave(textEditorElement) {
  var textEditor;
  if (typeof textEditorElement.getModel != 'function') return;
  textEditor = textEditorElement.getModel();
  if (typeof textEditor.getGrammar != 'function') return;
  if (textEditor.getGrammar() == stylusGrammar) {
    compile(textEditor.getText(), textEditor.getURI());
  }
}

function compile(source, URI) {
  var params = getParams(source, URI);

  if (params == null) return;

  if (params.main) {
    var mainPath = path.resolve(path.dirname(URI), `${params.main}`);
    fs.readFile(mainPath, 'utf8', (err, mainSource) => {
      if (err) return atom.notifications.addError(`Error while reading file: ${mainPath}`);
      compile(mainSource, mainPath);
    });
  }

  if (params.out) {
    params.inPath = URI;
    params.outPath = path.resolve(path.dirname(URI), `${params.out}`);
    render(source, params);
  }
}

function render(source, params) {
  var {inPath, compress, sourcemap, outPath, libs} = params;
  var fileDir = path.dirname(path.resolve(inPath));
  getStylusExecutable(fileDir).then(stylus =>
    stylus(source)
      .set('paths', [fileDir])
      .set('filename', inPath)
      .set('dest', outPath)
      .set('compress', compress)
      .set('sourcemap', sourcemap)
  ).then(renderer =>
    includeLibs(renderer, libs, fileDir)
  ).then(renderer =>
    renderer.render((error, css) => {
      if (error) return showView('error', error.message, `${error.filename}: ${error.line}`);

      writeFile(css, outPath);
      if (renderer.sourcemap) {
        writeFile(JSON.stringify(renderer.sourcemap), `${outPath}.map`);
      }
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
  if (!libs.length) return Promise.resolve(renderer);
  return Promise.all(libs.map(lib =>
    getLibPath(basedir, lib).then(filename =>
      renderer.use(require(filename)())
    )
  )).then(() => renderer);
}

function getLibPath(basedir, lib) {
  return getModulePath(basedir, lib).catch(() =>
    Promise.all(process.env.STYLUS_LIB_PATH.split(path.delimiter).map(dir =>
      getModulePath(dir, lib)
    )).then(dirs => dirs.find(dir => dir))
  );
}

function getModulePath(basedir, module) {
  return new Promise((accept, reject) =>
    resolve(module, {basedir}, (error, filename) => {
      error ? reject(error) : accept(filename);
    })
  );
}

function writeFile(content, filePath) {
  mkdirp(path.dirname(filePath), error => {
    if (error) return showView('error', error.message);

    fs.writeFile(filePath, content, error => {
      if (error) return showView('error', error.message);

      showView('success', getRelativePath(filePath));
    });
  });
}

function getProjectPath(filePath) {
  for (let projectPath of atom.project.getPaths()) {
    if (filePath.match(projectPath)) return projectPath;
  }
}

function getRelativePath(filePath) {
  var regex = new RegExp(`^${getProjectPath(filePath)}/?`);
  return filePath.replace(regex, '');
}

// match the first comment in the file
function getParams(source, inFile) {
  var [, paramString] = source.match(/^\s*\/\/(.*)$/m) || [];
  if (!paramString) return;

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

function replacePlaceholders(outPath, inFile) {
  var extname = path.extname(inFile);
  var basename = inFile.substr(0, inFile.length - extname.length);
  extname = extname.substr(1);
  return outPath.replace('$1', basename).replace('$2', extname);
}
