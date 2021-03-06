// USER CONFIGURATION//{{{
config = { // -- these can be overriden in URL
// title format:
// special expressions are enclosed in curly brackets:
//   title     -- gallery title
//   now       -- current item id
//   max       -- number of items
//   filename  -- filename
//   remaining -- number of items after the current
title_fmt: '%{title}: %{now}/%{max} "%{filename}"',

zoom_step: 0.125,

progress_radius: 22,
progress_width: 4,
progress_inner_width: 4,
progress_bg: "rgba(200,200,200,0.4)",
progress_fg: "white",
progress_shadow: 10,
progress_blur: 10,

font_size: 16,
font_test: 'Click to edit!\n\nLorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nPříšerně žluťoučký kůň úpěl ďábelské ódy.\nPŘÍŠERNĚ ŽLUŤOUČKÝ KŮŇ ÚPĚL ĎÁBELSKÉ ÓDY\n\nint main(int argc, char* argv[]) {\n  printf( \"\%20s\",(argc>2) ? argv[1] : "hello" );\n  return 1234567890;\n}',

thumbnail_font_test: "0123456789 .,:;?!=+-*/\\&@#$%<>()[]{} Příšerně žluťoučký kůň úpěl ďábelské ódy",

autoplay: false,
loop: false,
autonext: false,

pop_info_delay: 2000,
pop_preview_delay: 2000,

// use canvas to draw images
image_on_canvas: false,

// reload every nth items (0: don't reload)
// -- memory leaks workaround
reload_every: 0,

// show key combinations pressed
show_keys: false,
// show events
show_events: false,

// slideshow mode
slideshow: false,
// view next item after N ms
slideshow_delay: 5000,

// slide scroll coefficient (0 to turn off)
slide_scroll: 200,
}

config_strict = { // -- these can't be overridden in URL
//preload_views: 3,
}
//}}}

// CONTROLS//{{{
/*
 * Format
 * ------
 * Each entry in controls Object has following format:
 * [key, function, description]
 * key
 *   string containing key combination or array of such strings
 *   (see next section)
 * function
 *   function or string that is evaluated if key combination
 *   (or any combination from array) is triggered
 * description
 *   optional field; if present the key combination is visible
 *   in help window with given description
 *
 * Key combination format
 * ----------------------
 * Modifier can be one of these:
 * (you can use either one letter or the full name)
 *   A - Alt
 *   C - Control
 *   M - Meta (Command key on Macintosh keyboard)
 *   S - Shift
 *
 * e.g.: "A-S-Left" (Alt+Shift+Left arrow)
 *
 */
var list_keys = ["KP5","5","l"];
var help_keys = ["S-?","?","h","F1"];
var option_keys = ["c", "S-p"];
var exit_keys = ["Escape","Enter","Space"];
controls = {
// global keys
Any: [
    [list_keys, "mode(modes.itemlist)", "Show item list"],
    [help_keys, "mode(modes.help)", "Show help"],
    [option_keys, "mode(modes.options)", "Show options"],
    // emulate browser history
    [["Alt-Left"], back, "Go back in history"],
    [["Alt-Right"], forward, "Go forward in history"],
    ["o", "info && popInfo(); popPreview()", "Show info"],
    // scroll
    [["KP8","8","Up","w"], scrollUp],
    [["KP2","2","Down","s"], scrollDown],
    [["KP6","6","Right","d"], scrollRight],
    [["KP4","4","Left","a"], scrollLeft]
],

Viewer: [
    // scroll right OR video seek OR
    // view next item in gallery (if current item fits horizontally to window)
    [["Right","d"],
     "scrollRight() || videoSeek(5) || (viewer.width() <= window.innerWidth+24 && next())",
     "Faster playback/Move window right/Next gallery item"],
    [["Left","a"],
     "scrollLeft() || videoSeek(-5) || (viewer.width() <= window.innerWidth+24 && prev())",
     "Slower playback/Move window left/Previous gallery item"],
    // scrollup if not at top or show info
    [["KP8","8","Up","w"], "scrollUp() || popInfo()", "Move window up"],
    [["KP2","2","Down","s"], scrollDown, "Move window down"],
    ["PageUp", "scrollUp(window.innerHeight*9/10) || prev()"],
    ["PageDown", "scrollDown(window.innerHeight*9/10) || next()"],
    ["End", "scrollDown(b.height())"],
    ["Home", "scrollTo(0,0)"],
    ["Space", "videoTogglePlay() || (showLastPosition() && scrollDown(window.innerHeight*9/10)) || next()",
            "Play or pause/Move window down/Next gallery item"],
    ["Shift-Space", "showLastPosition() && scrollUp(window.innerHeight*9/10) || prev()",
            "Move window up/Previous gallery item"],
    ["x", editText, "Edit font text"],
    [["KP1","1"], "go(ls.length())", "Browse to last gallery item"],
    [["KP3","3"], "go(n+5)", "Browse to fifth next gallery item"],
    [["KP4","4","k","K","q","Q"], prev, "Previous"],
    [["KP6","6","Enter","j","J","e","E"], next, "Next"],
    [["KP7","7"], "go(1)", "Browse to first gallery item"],
    [["KP9","9"], "go(n-5)", "Browse to fifth previous gallery item"],
    [["KP0","0"], "videoSpeed(0)", "Normal speed playback"],
    ["+", "zoom('+')", "Zoom in"],
    ["Minus", "zoom('-')", "Zoom out"],
    ["*", "zoom(1)", "Zoom to original size"],
    ["/", "zoom('fit')", "Zoom to fit"],
    [".", "zoom('fill')", "Zoom to fill"],
    ["p", "mode(mode.slideshow)", "Slideshow"],
    ["r", "rotate(90)", "Rotate item 90 degrees clockwise"],
    ["e", "rotate(-90)", "Rotate item 90 degrees counter-clockwise"],
],

"Item List": [
    [list_keys.concat(exit_keys), modeDrop],
    ["Enter", "itemlist.submit()", "Go to selected item"],
    [["Left","KP4","4","a","j"], "itemlist.listLeft()", "Move cursor left"],
    [["Right","KP6","6","d","k"],"itemlist.listRight()", "Move cursor right"],
    [["Up","KP8","8","w"], "itemlist.listUp()", "Move cursor up"],
    [["Down","KP2","2","s"], "itemlist.listDown()", "Move cursor down"],
    [["PageUp","KP9","9"], "itemlist.listPageUp();", "Previous page"],
    [["PageDown","KP3","3"], "itemlist.listPageDown()", "Next page"],
    [["End","KP1","1"], "itemlist.listEnd()","Move cursor on last item in list"],
    [["Home","KP7","7"], "itemlist.listHome()", "Move cursor on first item in list"],
    ["n", "itemlist.nextPage()", "Next page"],
    ["b", "itemlist.prevPage()", "Previous page"],
],

Help: [
    [help_keys.concat(exit_keys), modeDrop],
    // disable item list and options
    [list_keys, ""],
    [option_keys, ""]
],

Options: [
    [option_keys.concat(exit_keys), modeDrop],
    ["Enter", saveOptions],
    // disable item list and help
    [list_keys, ""],
    [help_keys, ""]
],

Slideshow: [
    ["Escape", modeDrop, "Exit slideshow"],
    [["Right", "Space", "Enter", "PageDown", "d"], next, "Next item"],
    [["Left", "S-Space", "PageUp", "a"], prev, "Previous item"],
],
}
//}}}

// EVENTS//{{{
events = {
// document loaded
load: "",
// item view at top/bottom
top: "",
bottom: "",
leftmost: "",
rightmost: "",
// item view scrolled
scroll: "popPreview()",
// video played/paused
video_play: "",
// window resized
resize: "",
// other item viewed
go: "",
// first/last item viewed
first: "",
last: "",
// info updated
info_update: popInfo,
// zoom
zoom: popInfo,
// image is too big
too_big: popPreview,
// image mouse down
image_mouse_down: "dragScroll(viewer.e)",
font_mouse_down: editText,
// preview mouse down
preview_mouse_down: "dragScroll(viewer.e, viewer.preview_img)",
itemlist_mouse_down: "dragScroll(itemlist.e)",
// item cannot be displayed of file missing
error: "",
}
//}}}

