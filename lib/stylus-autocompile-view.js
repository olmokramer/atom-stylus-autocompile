'use babel';

var tile;
var view;
var files = [];

function createView() {
  view = document.createElement('div');

  view.classList.add('status-stylus-autocompile', 'inline-block');
  view.innerHTML = `<span class="files text-success">\u2714 <span class="count">0</span> files compiled</span>
                    <span class="errors text-error">\u2718 <span class="count">0</span> errors</span>`;
  hideView();

  view.addEventListener('click', () => {
    if(!files.length) return;
    atom.notifications.addSuccess('Output files:', {detail: files.sort().join('\n')});
    files = [];
  });
}

export function initView(statusBar) {
  createView();
  tile = statusBar.addLeftTile({item: view, priority: 100000});
}

export function deinitView() {
  tile.destroy();
  tile = view = null;
  files = [];
}

export function showView(type, msg, detail) {
  switch(type) {
  case 'error':
    atom.notifications.addError(msg, detail ? {detail} : {});
    show(getErrors());
    getErrors().querySelector('.count').textContent++;
    break;
  case 'success':
  default:
    show(getFiles());
    getFiles().querySelector('.count').textContent = files.push(msg);
    break;
  }
  show(view);
  setTimeout(hideView, 5000);
}

function show(el) {
  el.style.display = '';
}

function hideView() {
  hide(view);
  hide(getFiles());
  hide(getErrors());
  files = [];
  getErrors().querySelector('.count').textContent = 0;
}

function hide(el) {
  el.style.display = 'none';
}

function getFiles() {
  return view.querySelector('.files');
}

function getErrors() {
  return view.querySelector('.errors');
}
