/**
 * Javascript utility functions for openemr
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 * @author    Brady Miller <brady.g.miller@gmail.com>
 * @author    Jerry Padgett <sjpadgett@gmail.com>
 * @copyright Copyright (c) 2019 Brady Miller <brady.g.miller@gmail.com>
 * @copyright Copyright (c) 2019 Jerry Padgett <sjpadgett@gmail.com>
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */
/* We should really try to keep this library jQuery free ie javaScript only! */

// Translation function
// This calls the i18next.t function that has been set up in main.php
function xl(string) {
    if (typeof top.i18next.t == 'function') {
        return top.i18next.t(string);
    } else {
        // Unable to find the i18next.t function, so log error
        console.log("xl function is unable to translate since can not find the i18next.t function");
        return string;
    }
}

/*
* function includeDependency(url, async)
*
* @summary Dynamically include JS Scripts or Css.
*
* @param {string} url file location.
* @param {boolean} async true/false load asynchronous/synchronous.
* @param {string} 'script' | 'link'.
*
* */
function includeDependency(url, async, type) {
    try {
        let request = new XMLHttpRequest();
        if (type === "link") {
            let headElement = document.getElementsByTagName("head")[0];
            let newScriptElement = document.createElement("link")
            newScriptElement.type = "text/css";
            newScriptElement.rel = "stylesheet";
            newScriptElement.href = url;
            headElement.appendChild(newScriptElement);
            console.log('Needed to load:[ ' + url + ' ] For: [ ' + location + ' ]');
            return false;
        }
        request.open("GET", url, async); // false = synchronous.
        request.send(null);
        if (request.status === 200) {
            if (type === "script") {
                let headElement = document.getElementsByTagName("head")[0];
                let newScriptElement = document.createElement("script");
                newScriptElement.type = "text/javascript";
                newScriptElement.text = request.responseText;
                headElement.appendChild(newScriptElement);
                console.log('Needed to load:[ ' + url + ' ] For: [ ' + location + ' ]');
                return false; // in case req comes from a submit form.
            }
        }
        new Error("Failed to get URL:" + url);
    } catch (e) {
        throw e;
    }
}

/*
*  This is where we want to decide what we need for the instance
*  We only want to load any needed dependencies.
*
*/
document.addEventListener('DOMContentLoaded', function () {
    let isNeeded = document.querySelectorAll('.drag-action').length;
    let isNeededResize = document.querySelectorAll('.resize-action').length;
    if (isNeeded || isNeededResize) {
        initDragResize();
    }

}, false);

/*
* @function initDragResize(dragContext, resizeContext)
* @summary call this function from scripts you may want to provide a different
*  context other than the page context of this utility
*
* @param {object} context of element to apply drag.
* @param {object} optional context of element. document is default.
*/
function initDragResize(dragContext, resizeContext = document) {
    let isLoaded = typeof window.interact;
    if (isLoaded !== 'function') {
        let load = async () => {
            let interactfn = top.webroot_url + '/public/assets/interactjs/dist/interact.js';
            await includeScript(interactfn, false, 'script');
        };
        load().then(rtn => {
            initInteractors(dragContext, resizeContext);
        });
    }
}

/* function to init all page drag/resize elements.*/
function initInteractors(dragContext = document, resizeContext = '') {
    resizeContext = resizeContext ? resizeContext : dragContext;
    /* Draggable */
    interact(".drag-action", {context: dragContext}).draggable({
        enabled: true,
        inertia: true,
        restrict: {
            restriction: "parent",
            endOnly: true,
            elementRect: {top: 0, left: 0, bottom: 1, right: 1}
        },
        snap: {
            targets: [interact.createSnapGrid({x: 1, y: 1})],
            range: Infinity,
            relativePoints: [{x: 0, y: 0}]
        },
        autoScroll: true,
        maxPerElement: 2
    }).on('dragstart', function (event) {
        event.preventDefault();
    }).on('dragmove', dragMoveListener);

    /* Resizable */
    interact(".resize-action", {context: resizeContext}).resizable({
        enabled: true,
        preserveAspectRatio: false,
        edges: {
            left: '.resize-s',
            right: true,
            bottom: true,
            top: '.resize-s'
        },
        inertia: {
            resistance: 30,
            minSpeed: 100,
            endSpeed: 50
        },
        snap: {
            targets: [
                interact.createSnapGrid({
                    x: 5, y: 5
                })
            ],
            range: Infinity,
            relativePoints: [{x: 0, y: 0}]
        },
    }).on('resizestart', function (event) {
        event.preventDefault();
    }).on('resizemove', function (event) {
        let target = event.target;
        let x = (parseFloat(target.getAttribute('data-x')) || 0);
        let y = (parseFloat(target.getAttribute('data-y')) || 0);

        target.style.width = event.rect.width + 'px';
        target.style.height = event.rect.height + 'px';
        x += event.deltaRect.left;
        y += event.deltaRect.top;

        target.style.webkitTransform = target.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    });

    function dragMoveListener(event) {
        let target = event.target;
        let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        if ('webkitTransform' in target.style || 'transform' in target.style) {
            target.style.webkitTransform =
                target.style.transform =
                    'translate(' + x + 'px, ' + y + 'px)';
        } else {
            target.style.left = x + 'px';
            target.style.top = y + 'px';
        }

        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }
}

/*
* Universal async BS alert message with promise
* Note the use of new javaScript translate function xl().
*
*/
if (typeof asyncAlertMsg !== "function") {
    function asyncAlertMsg(message, timer = 5000, type = 'danger', size = '') {
        let alertMsg = xl("Alert Notice");
        $('#alert_box').remove();
        size = (size == 'lg') ? 'left:25%;width:50%;' : 'left:35%;width:30%;';
        let style = "position:fixed;top:25%;" + size + " bottom:0;z-index:9999;";
        $("body").prepend("<div class='container text-center' id='alert_box' style='" + style + "'></div>");
        let mHtml = '<div id="alertmsg" class="alert alert-' + type + ' alert-dismissable">' +
            '<button type="button" class="close btn btn-link btn-cancel" data-dismiss="alert" aria-hidden="true"></button>' +
            '<h5 class="alert-heading text-center">' + alertMsg + '</h5><hr>' +
            '<p>' + message + '</p>' +
            '</div>';
        $('#alert_box').append(mHtml);
        return new Promise(resolve => {
            $('#alertmsg').on('closed.bs.alert', function () {
                clearTimeout(AlertMsg);
                $('#alert_box').remove();
                resolve('closed');
            });
            let AlertMsg = setTimeout(function () {
                $('#alertmsg').fadeOut(800, function () {
                    $('#alert_box').remove();
                    resolve('timedout');
                });
            }, timer);
        })
    }
}

/*
* function syncAlertMsg(()
*
* Universal sync BS alert message returns promise after resolve.
* Call below to return a promise after alert is resolved.
* Example: syncAlertMsg('Hello, longtime, 'success', 'lg').then( asyncRtn => ( ... log something });
*
* Or use as IIFE to run inline.
* Example:
*   (async (time) => {
*       await asyncAlertMsg('Waiting till x'ed out or timeout!', time); ...now go;
*   })(3000).then(rtn => { ... but then could be more });
*
* */
async function syncAlertMsg(message, timer = 5000, type = 'danger', size = '') {
    return await asyncAlertMsg(message, timer, type, size);
}

/* Handy function to set values in globals user_settings table */
if (typeof persistUserOption !== "function") {
    const persistUserOption = function (option, value) {
        return $.ajax({
            url: top.webroot_url + "/library/ajax/user_settings.php",
            type: 'post',
            contentType: 'application/x-www-form-urlencoded',
            data: {
                csrf_token_form: top.csrf_token_js,
                target: option,
                setting: value
            },
            beforeSend: function () {
                top.restoreSession();
            },
            error: function (jqxhr, status, errorThrown) {
                console.log(errorThrown);
            }
        });
    };
}

/**
 * User Debugging Javascript Errors
 * Turn on/off in Globals->Logging
 *
 * @package   OpenEMR Utilities
 * @link      http://www.open-emr.org
 * @author    Jerry Padgett <sjpadgett@gmail.com>
 */

if (typeof top.userDebug !== 'undefined' && (top.userDebug === '1' || top.userDebug === '3')) {
    window.onerror = function (msg, url, lineNo, columnNo, error) {
        const is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
        const is_firefox = navigator.userAgent.indexOf('Firefox') > -1;
        const is_safari = navigator.userAgent.indexOf("Safari") > -1;

        var showDebugAlert = function (message) {
            let errorMsg = [
                'URL: ' + message.URL,
                'Line: ' + message.Line + ' Column: ' + message.Column,
                'Error object: ' + JSON.stringify(message.Error)
            ].join("\n");

            let msg = message.Message + "\n" + errorMsg;
            console.error(xl('User Debug Error Catch'), message);
            alert(msg);

            return false;
        };

        let string = msg.toLowerCase();
        let substring = xl("script error"); // translate to catch for language of browser.
        if (string.indexOf(substring) > -1) {
            let xlated = xl('Script Error: See Browser Console for Detail');
            showDebugAlert(xlated);
        } else {
            let message = {
                Message: msg,
                URL: url,
                Line: lineNo,
                Column: columnNo,
                Error: JSON.stringify(error)
            };

            showDebugAlert(message);
        }

        return false;
    };
}

