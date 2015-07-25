'use babel';
import fs from 'fs';
import path from 'path';
import { CompositeDisposable } from 'atom';
import mkdirp from 'mkdirp';
import stylus from 'stylus';

var disposable;

export function activate() {
  disposable = new CompositeDisposable(
    atom.commands.add('atom-text-editor', 'core:save', event => handleSave(event.currentTarget.getModel()))
  );
}

export function deactivate() {
  disposable.dispose();
  disposable = null;
}

const stylusGrammar = atom.grammars.grammarForScopeName('source.stylus');

function handleSave(textEditor) {
  if(textEditor.getGrammar() == stylusGrammar) {
    compile(textEditor);
  }
}

function compile(textEditor) {
  var source = textEditor.getText();
  var params = getParams(source);

  if(!params) return;

  if(params.main) {
    var newPath = path.resolve(textEditor.getURI(), `../${params.main}`);
    source = fs.readFileSync(newPath, 'utf8');
    params = getParams(source);
    if(!params) return;

    params.inPath = newPath;
  } else if(params.out) {
    params.inPath = textEditor.getURI();
  }

  params.outPath = path.resolve(params.inPath, `../${params.out}`);
  render(source, params);
}

function render(source, params) {
  var renderer = stylus(source)
    .set('paths', [path.dirname(path.resolve(params.inPath))])
    .set('filename', path.basename(params.inPath))
    .set('sourcemap', params.sourcemap)
    .set('compress', params.compress);

  renderer.render((error, css) => {
    if(error) return atom.notifications.addError(error.message, {
      detail: `${error.filename}:${error.line}`,
      dismissable: true,
    });

    writeFile(css, params.outPath);
    if(renderer.sourcemap) writeFile(JSON.stringify(renderer.sourcemap), `${params.outPath}.map`);
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
  var [ , paramString ] = source.match(/^\s*\/\/([^\n]+)\n/) || [];
  if(paramString) return parseParams(paramString);
}

function parseParams(string) {
  var params = {};
  for(let pair of string.replace(/\s/g, '').split(',')) {
    let [ key, value ] = pair.split(':');
    if(['true', 'yes', '1'].indexOf(value) > -1) value = true;
    params[key] = value;
  }
  return params;
}
