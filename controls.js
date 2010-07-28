/*
 * Modifiers
 * ---------
 * A - Alt
 * C - Control
 * M - Meta (Command key on Macintosh keyboard)
 * S - Shift
 *
 * Sort modifiers in alphabetical order.
 *
 * e.g.: "A-S-Left" (Alt+Shift+Left arrow)
 *
 */
controls = {
// global keys
Any: [
    [["KP5","5"], "toggleList()", "Toggle thumbnail list"],
    [["?","h"], "toggleHelp()", "Show this help"],
    [["Left","a"], "videoSlower() || scrollLeft() || prev()", "Slower playback/Move window left/Previous gallery item"],
    [["Right","d"], "videoFaster() || scrollRight() || next()", "Faster playback/Move window right/Next gallery item"],
    [["KP8","8","Up","w"], "scrollUp()", "Move window up"],
    [["KP2","2","Down","s"], "scrollDown()", "Move window down"],
    // emulate browser history
    [["A-Left"], "back();"],
    [["A-Right"], "forward();"],
    ["o", "info && popInfo(); popPreview()", "Show info"]
],

// item viewer
Viewer: [
    ["PageUp", "scrollUp()"],
    ["PageDown", "scrollDown()"],
    ["End", "scrollDown(b.scrollHeight)"],
    ["Home", "scrollTo(0,0)"],
    ["Space", "videoTogglePlay() || scrollDown(window.innerHeight*9/10) || next()",
            "Move window down/Next gallery item/Play or pause"],
    ["e", "editText()", "Edit font text"],
    [["KP1","1"], "go(len)", "Browse to last gallery item"],
    [["KP3","3"], "go(n+5)", "Browse to fifth next gallery item"],
    [["KP4","4","k","K","q","Q"], "prev()", "Previous"],
    [["KP6","6","Enter","j","J","e","E"], "next()", "Next"],
    [["KP7","7"], "go(1)", "Browse to first gallery item"],
    [["KP9","9"], "go(n-5)", "Browse to fifth previous gallery item"],
    [["KP0","0"], "videoSpeed(0)", "Normal speed playback"],
    ["+", "zoom('+')", "Zoom in"],
    ["-", "zoom('-')", "Zoom out"],
    ["*", "zoom(1)", "Zoom to original size"],
    ["/", "zoom('fit')", "Zoom to fit"],
    [".", "zoom('fill')", "Zoom to fill"],
],

// item list
"Item List": [
    ["Escape", "toggleList()", "Hide item list"],
    ["Enter", "itemlist.submitSelected()", "Go to selected item"],
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
    // disable showing item list in help mode
    [["KP5","5"], "", ""],
    [["?","h","Escape"], "toggleHelp()", "Hide help"],
],
}
