StylusAutocompileView = require './stylus-autocompile-view'

module.exports =
  stylusAutocompileView: null

  activate: (state) ->
    @stylusAutocompileView = new StylusAutocompileView(state.stylusAutocompileViewState)

  deactivate: ->
    @stylusAutocompileView.destroy()

  serialize: ->
    stylusAutocompileViewState: @stylusAutocompileView.serialize()
