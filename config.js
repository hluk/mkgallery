// USER CONFIGURATION//{{{
config = { // -- these can be overriden in URL
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
reload_every: 20,

// show key combinations pressed
show_keys: false,
// show events
show_events: false,

// slideshow mode
slideshow: false,
// view next item after N ms
slideshow_delay: 5000,

// slide scroll coefficient (0 to turn off)
slide_scroll: 100,
}

configStrict = { // -- these can't be overridden in URL
preload_images: 3,
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
controls = {
// global keys
Any: [
    [["KP5","5"], toggleList, "Toggle thumbnail list"],
    [["S-?","?","h"], toggleHelp, "Show this help"],
    // emulate browser history
    [["Alt-Left"], back, "Go back in history"],
    [["Alt-Right"], forward, "Go forward in history"],
    ["o", "info && popInfo(); popPreview()", "Show info"]
],

// item viewer
Viewer: [
    // scroll right OR video seek OR
    // view next item in gallery (if current item fits horizontally to window)
    [["Right","d"],
     "scrollRight() || videoSeek(5) || (viewer.width() <= window.innerWidth && next())",
     "Faster playback/Move window right/Next gallery item"],
    [["Left","a"],
     "scrollLeft() || videoSeek(-5) || (viewer.width() <= window.innerWidth && prev())",
     "Slower playback/Move window left/Previous gallery item"],
    // scrollup if not at top or show info
    [["KP8","8","Up","w"], "window.pageYOffset ? scrollUp() : popInfo()", "Move window up"],
    [["KP2","2","Down","s"], scrollDown, "Move window down"],
    ["PageUp", "scrollUp(window.innerHeight*9/10) || prev()"],
    ["PageDown", "scrollDown(window.innerHeight*9/10) || next()"],
    ["End", "scrollDown(b.scrollHeight)"],
    ["Home", "scrollTo(0,0)"],
    ["Space", "videoTogglePlay() || scrollDown(window.innerHeight*9/10) || next()",
            "Play or pause/Move window down/Next gallery item"],
    ["Shift-Space", "scrollUp(window.innerHeight*9/10) || prev()",
            "Move window up/Previous gallery item"],
    ["x", editText, "Edit font text"],
    [["KP1","1"], "go(len())", "Browse to last gallery item"],
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
    ["p", slideshow, "Slideshow"],
],

// item list
"Item List": [
    ["Escape", toggleList, "Hide item list"],
    ["Enter", "go(itemlist.selected+1)", "Go to selected item"],
    [["Left","KP4","4","a"], "itemlist.listLeft()", "Move cursor left"],
    [["Right","KP6","6","d"],"itemlist.listRight()", "Move cursor right"],
    [["Up","KP8","8","w"], "itemlist.listUp()", "Move cursor up"],
    [["Down","KP2","2","s"], "itemlist.listDown()", "Move cursor down"],
    [["PageUp","KP9","9"], "itemlist.listPageUp();", "Previous page"],
    [["PageDown","KP3","3"], "itemlist.listPageDown()", "Next page"],
    [["End","KP1","1"], "itemlist.selectItem(itemlist.size()-1)","Move cursor on last thumbnail"],
    [["Home","KP7","7"], "itemlist.selectItem(0)", "Move cursor on first thumbnail"],
],

// help
Help: [
    [["?","h","Escape","Enter","Space"], toggleHelp, "Hide help"],
    // disable showing item list in help mode
    [["KP5","5"], ""],
    // scroll help
    [["KP8","8","Up","w"], scrollUp, ""],
    [["KP2","2","Down","s"], scrollDown, ""],
    [["KP6","6","Right","d"], scrollRight, ""],
    [["KP4","4","Left","a"], scrollLeft, ""],
],

// slideshow
Slideshow: [
    ["Escape", exit_slideshow, "Exit slideshow"],
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
// item view scrolled
scroll: "mode() == modes.viewer && popPreview()",
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
preview_mouse_down: "dragScroll(viewer.e, viewer.preview, true)",
itemlist_mouse_down: "dragScroll(itemlist.e)",
// item cannot be displayed of file missing
error: "",
}
//}}}

