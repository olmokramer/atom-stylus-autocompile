'use babel';
import fs from 'fs';
import path from 'path';
import { CompositeDisposable } from 'atom';
import mkdirp from 'mkdirp';
import stylus from 'stylus';

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
}

const stylusGrammar = atom.grammars.grammarForScopeName('source.stylus');

function handleSave(textEditorElement) {
  if(typeof textEditorElement.getModel != 'function') return;
  var textEditor = textEditorElement.getModel();
  if(textEditor.getGrammar() == stylusGrammar) {
    compile(textEditor);
  }
}

function compile(textEditor) {
  var source = textEditor.getText();
  var params = getParams(source);

  if(params.main) {
    var newPath = path.resolve(textEditor.getURI(), `../${params.main}`);
    source = fs.readFileSync(newPath, 'utf8');
    params = getParams(source);
    if(!params) return;

    params.inPath = newPath;
  } else if(params.out) {
    params.inPath = textEditor.getURI();
  }

  if(!params.inPath) return;

  params.outPath = path.resolve(params.inPath, `../${params.out}`);
  render(source, params);
}

function render(source, params) {
  var {inPath, compress, sourcemap} = params;
  var renderer = stylus(source)
    .set('paths', [path.dirname(path.resolve(inPath))])
    .set('filename', path.basename(inPath))
    .set('compress', compress)
    .set('sourcemap', sourcemap);

  renderer.render((error, css) => {
    if(error) return atom.notifications.addError(error.message, {
      detail: `${error.filename}:${error.line}`,
      dismissable: true,
    });

    writeFile(css, params.outPath);
    if(renderer.sourcemap) {
      writeFile(JSON.stringify(renderer.sourcemap), `${params.outPath}.map`);
    }
  });
}

function writeFile(content, filePath) {
  mkdirp(path.dirname(filePath), error => {
    if(error) return atom.notifications.addError(error.message);

    fs.writeFile(filePath, content, error => {
      if(error) return atom.notifications.addError(error.message);

      atom.notifications.addSuccess(`Saved to ${filePath}`);
    });
  });
}

// match the first comment in the file
function getParams(source) {
  var [, paramString] = source.match(/^\s*\/\/\s*([^\n]*)/) || [];
  if(!paramString) return;

  paramString = paramString.trim();
  var main = getParam(paramString, 'main');
  var out = getParam(paramString, 'out');
  var compress = getParam(paramString, 'compress', true);
  var sourcemap = getParam(paramString, 'sourcemap', true);
  return {main, out, compress, sourcemap};
}

function getParam(paramString, key, parseBool = false) {
  var regex = new RegExp(`${key}\s*:\s*([^,]+)`);
  var [, value] = paramString.match(regex) || [null, ''];
  value = value.trim();
  if(parseBool) {
    if(value && value == 'false') {
      value = false;
    } else {
      value = !!value;
    }
  }
  return value;
}
