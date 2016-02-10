'use babel';
import fs from 'fs';
import path from 'path';
import { CompositeDisposable } from 'atom';
import mkdirp from 'mkdirp';
import stylus from 'stylus';
import nib from 'nib';
import {initView, deinitView, showView} from './stylus-autocompile-view.js';

var disposable;

export function activate() {
  disposable = new CompositeDisposable(
    atom.commands.add('atom-text-editor', 'core:save', ({currentTarget}) =>
      handleSave(currentTarget)
    ),
  );
}

export function deactivate() {
  disposable.dispose();
  disposable = null;
  deinitView();
}

const stylusGrammar = ['source.css.stylus', 'source.stylus']
  .map((scopeName) => atom.grammars.grammarForScopeName(scopeName))
  .find((x) => x);

function handleSave(textEditorElement) {
  if(typeof textEditorElement.getModel != 'function') return;
  var textEditor = textEditorElement.getModel();
  if(textEditor.getGrammar() == stylusGrammar) {
    compile(textEditor.getText(), textEditor.getURI());
  }
}

function compile(source, URI) {
  var params = getParams(source);

  if(params == null) return;

  if(params.main) {
    var mainPath = path.resolve(path.dirname(URI), `${params.main}`);
    fs.readFile(mainPath, 'utf8', (err, mainSource) => {
      if(err) return atom.notifications.addError(`Error while reading file: ${mainPath}`);
      compile(mainSource, mainPath);
    });
  }
  if(params.out) {
    params.inPath = URI;
    params.outPath = path.resolve(path.dirname(URI), `${params.out}`);
    render(source, params);
  }
}

function render(source, params) {
  var {inPath, compress, sourcemap, outPath} = params;
  var renderer = stylus(source)
    .set('paths', [path.dirname(path.resolve(inPath))])
    .set('filename', path.basename(inPath))
    .set('dest', outPath)
    .set('compress', compress)
    .set('sourcemap', sourcemap);

  if(params.nib) {
    renderer.use(nib());
    renderer.import('nib');
  }

  renderer.render((error, css) => {
    if(error) return showView(error.message, 'error', `${error.filename}: ${error.line}`);

    writeFile(css, outPath);
    if(renderer.sourcemap) {
      writeFile(JSON.stringify(renderer.sourcemap), `${outPath}.map`);
    }
  });
}

function writeFile(content, filePath) {
  mkdirp(path.dirname(filePath), error => {
    if(error) return showView(error.message, 'error');

    fs.writeFile(filePath, content, error => {
      if(error) return showView(error.message, 'error');

      showView(getRelativePath(filePath), 'success');
    });
  });
}

// match the first comment in the file
function getParams(source) {
  var [, paramString] = source.match(/^\s*\/\/(.*)$/m) || [];
  if(!paramString) return;

  paramString = paramString.trim();
  var main = getParam(paramString, 'main');
  var out = getParam(paramString, 'out');
  if(!out) return main ? {main} : null;

  var compress = getParam(paramString, 'compress', true);
  var sourcemap = getParam(paramString, 'sourcemap', true);
  var nib = getParam(paramString, 'nib', true);
  return {main, out, compress, sourcemap, nib};
}

function getParam(paramString, key, isBool = false) {
  var regex = new RegExp(`${key}\s*:\s*([^,]+)`);
  var [, value] = paramString.match(regex) || [null, ''];
  value = value.trim();
  if(isBool) value = parseBool(value);
  return value;
}

function parseBool(value) {
  if(value == 'false') {
    return false;
  }
  return !!value;
}

function getProjectPath(filePath) {
  for(let projectPath of atom.project.getPaths()) {
    if(filePath.match(projectPath)) return projectPath;
  }
}

function getRelativePath(filePath) {
  var regex = new RegExp(`^${getProjectPath(filePath)}/?`)
  return filePath.replace(regex, '');
}

export function consumeStatusBar(statusBar) {
  initView(statusBar);
}
