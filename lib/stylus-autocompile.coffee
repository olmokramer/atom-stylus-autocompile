fs = require 'fs'
path = require 'path'
[mkdirp, stylus] = []

class StylusAutocompile
  activate: ->
    @disposable = atom.commands.add 'atom-workspace', 'core:save', @handleSave

  deactivate: ->
    @disposable.dispose()

  handleSave: =>
    @activeEditor = atom.workspace.getActiveTextEditor()
    return unless @activeEditor?

    scopeName = @activeEditor.getGrammar().scopeName
    return unless scopeName.match /\bstylus\b/

    @compile()

  compile: ->
    params = @getParams @activeEditor.getURI(), @activeEditor.getText()
    return unless params?

    filePath = @activeEditor.getURI()

    if params.main?
      filePath = path.resolve path.dirname(filePath), params.main
      fs.readFile filePath, 'utf8', (err, source) =>
        params = @getParams filePath, source
        return unless params?
        @render params, source
    else
      @render params, @activeEditor.getText()

  render: (params, source) ->
    stylus ?= require 'stylus'
    renderer = stylus source
      .set 'paths', [path.dirname path.resolve params.file]
      .set 'filename', path.basename params.file
      .set 'sourcemap', params.sourcemap
      .set 'compress', params.compress

    renderer.render (err, css) =>
      if err?
        atom.notifications.addError err.message,
          detail: "#{err.filename}:#{err.line}"
          dismissable: true
        return

      filePath = path.resolve path.dirname(params.file), params.out

      @writeFile filePath, css
      if renderer.sourcemap?
        @writeFile "#{filePath}.map", JSON.stringify renderer.sourcemap

  getParams: (filePath, fileContent) ->
    serialized = @getSerializedParams fileContent
    return unless serialized?

    params = file: filePath
    for param in serialized.split /\s*,\s*/
      [key, value] = param.split /\s*:\s*/
      continue unless key? and value?
      params[key] = value

    params.compress = @parseBoolean params.compress
    params.sourcemap = @parseBoolean params.sourcemap
    return params if params.out or params.main

  getSerializedParams: (fileContent) ->
    serialized = fileContent.match /^.*\n/
    return unless serialized?
    serialized[0].replace(/^\/\/\s+/, '').replace(/\n/, '')

  writeFile: (filePath, content) ->
    mkdirp ?= require 'mkdirp'
    dirPath = path.dirname filePath
    mkdirp dirPath, (err) =>
      if err
        atom.notifications.addError err.message
        return

      fs.writeFile filePath, content, (err) ->
        if err
          atom.notifications.addError err.message
          return

        atom.notifications.addSuccess "#{filePath} created"

  parseBoolean: (value) ->
    value is 'true' or value is 'yes' or value is 1

module.exports = new StylusAutocompile()
