/**
 *
 * JavaDocMozPlugin 
 *
 * A firefox extension for finding javadoc info.
 *
 */
var javadocmozplugin = {

    ALL_CLASSES_PAGE: "allclasses-noframe.html",
    DEEP_MENUS: false,
    SEARCH_STRICT: true,
    VERBOSE_CLASSNAME: true,

    javadocs: {},
    docObjMap: {},
    prefs: null,

    // stalePrefs: true,

    /**
     * Search for the specified string matchMe in the 
     *  javadoc classes html pages.
     * 
     * @param matchMe The string to search for
     *
     * @return An array of page URLs for matching classes
     */
    search: function(matchMe) {

        var ret = new Array();

        //
        // In case they are searching with dot separated package names,
        // allow a match for those.
        //
        matchMe = matchMe.replace('.', '(\\.|\\/)');

        // var caseIgnore = "";
        var caseIgnore = "i";

        //
        // Search all docs.
        //
        for (var url in javadocmozplugin.javadocs) {
            var javadoc = javadocmozplugin.javadocs[url];

            var docObj = javadocmozplugin.docObjMap[url];
            if(docObj.loaded == false) {
                alert("Doc for " + docObj.url + " not loaded.");
                continue;
            }

            var lines = javadoc.split("\n");
            for(var i = 0; i < lines.length; i++) {

                var match = null;

                //
                // Check for search string strictness
                //
                if(javadocmozplugin.SEARCH_STRICT == false) {
                    //
                    // Substring class name matching regex
                    //
                    match = lines[i].match(
                        new RegExp('.*<a href="([^"]*)"'+
                                '.*title="(interface|class) in ([^"]*)">'+
                                '(<i>)?(.*'+matchMe+'[^<]*)(<\/i>)?<\/a>.*',
                                caseIgnore) 
                        );

                } else {
                    //
                    // Exact class name matching regex
                    //
                    match = lines[i].match(
                            new RegExp(
                                '.*<a href="([^"]*)"' +
                                '.*title="(interface|class) in ([^"]*)">' +
                                '(<i>)?('+matchMe+')(<\/i>)?<\/a>.*',
                                caseIgnore)
                        );
                }

                if(match !== null && match.length > 1) {
                    //
                    // Create object to return in our array of matches.
                    // This will contain the partial URL of the html file
                    // and the pretty java name with proper package
                    // notation.
                    //
                    var o = new Object();
                    o.urlpath = match[1];
                    o.type = match[2];
                    o.package = match[3];
                    o.classname = match[5];
                    o.prettyname = o.package + "." + o.classname;
                    o.docName = javadocmozplugin.docObjMap[url].name;

                    //
                    // Fix any relative URL paths
                    //
                    if(o.urlpath.indexOf("http://") != 0) {
                        o.urlpath = url + "/" + o.urlpath;
                    }
                    ret.push(o);
                }
            }
        }

        return ret;
    },

    /**
     * Add a single submenu item (like a "not found" message or a 
     * "loading" message, don't use this for search results lists.)
     */
    addSingleSubMenuItem: function(message) {
        javadocmozplugin.clearSubMenu();

        var popupMenu = document.getElementById(
                            "javadocmozplugin-context-submenu-popup");

        var menuitem = document.createElement("menuitem");
        menuitem.setAttribute("id", "javadocmozplugin-context-menu-item");
        menuitem.setAttribute("label", message);

        popupMenu.appendChild(menuitem); 
 
    },

    /**
     * Remove all items from the search results submenu.
     *
     */
    clearSubMenu: function() {
        var popupMenu = document.getElementById(
                            "javadocmozplugin-context-submenu-popup");
        
        //
        // Remove child items from previous search
        //
        while(popupMenu.firstChild) {
            popupMenu.removeChild(popupMenu.firstChild);
        }
    },

    /**
     *
     * Populate the context submenu with items returned from a call to
     * search().
     *
     * @param items The items returned by a call to search().
     *              Objects having the form { urlpath: ..., prettyname: ... }
     *
     */
    populateClassSubMenu: function(items) {
        var popupMenu = document.getElementById(
                            "javadocmozplugin-context-submenu-popup");
       
        javadocmozplugin.clearSubMenu();

        //
        // Add search results
        //
        for(var i = 0; i < items.length; i++) {
            var menu = document.createElement("menu");

            menu.setAttribute( "id", 
                                "javadocmozplugin-context-class-submenu-" + i);
            
            var labelText = items[i].classname;
            if(javadocmozplugin.VERBOSE_CLASSNAME == true) {
                labelText = items[i].prettyname + " (" +
                            items[i].docName + ")";
            }

            menu.setAttribute( "label", labelText );

            //
            // configure item command/events, submenus, etc.
            //
            javadocmozplugin.configureClassSubMenuItem(menu, items[i], i);

            popupMenu.appendChild(menu); 
        }
    },

    /**
     * 
     * Configure a classname sub menu item.
     *
     * @param menuitem A menuitem html element to configure
     * @param classitem The classitem object returned in the list
     *                  from search()
     * @param id        A unique id within our results for this class
     */
    configureClassSubMenuItem: function(menu, classItem, id) {

        javadocmozplugin.addClickEventForExternalLink(menu, classItem.urlpath);
        javadocmozplugin.loadClassPage(menu, classItem.urlpath, id);
    },
   
    /**
     * Since menu objects do not have "command" which works for
     * click, we can use their "click" event to create action for
     * jumping to external URLs in a new tab.
     * 
     * @param menu  A menu object
     * @param url   A URL to open in a new tab on clicking
     */
    addClickEventForExternalLink: function(menu, url) {

        //
        // Add menu item comment for handling clicking
        //
        (function(url) {
            menu.addEventListener(
                "click", 
                function(e) { 

                    if(this.id != e.target.id) {
                        return;
                    }

                    //
                    // Open class doc URL in new tab
                    //
                    var tab = gBrowser.addTab(url);
                    gBrowser.selectedTab = tab;

                    //
                    // Close the context menu
                    //
                    var ctxMenu = document.getElementById(
                                                "contentAreaContextMenu");
                    ctxMenu.hidePopup();

                }
            );
        })(url);

    },

    /**
     * Populate a submenu for members summar 
     *      (e.g fields submenu, method submenu)
     * with menuitems containing method / field signatures.
     * Extract this from the passed in html table.
     *
     * @param menu      The menu or manupopup to populate
     * @param child     The first child menu or menuitem to add.
     *                  I.e. header for shallow menus or popup for deep menus
     * @param html      The html representation of the summary table
     *                  for the class members (methods, contructors, fields)
     *                  The first table passed in should contain the relevant
     *                  data for the items, 
     *                  subsequent html tables are ingored.
     * @param url       URL to the java class page in 
     *                  order to create a clickable link
     */
    populateClassMemberMenuItems: function(menuPopup, child, html, url) {

        var tmp = content.document.createElement("div");
        tmp.innerHTML = html;
        var tables = tmp.getElementsByTagName("table");

        var topTable = tables[0];
        var rows = topTable.getElementsByTagName("tr");

        //
        // If row only has headers, do not add this item.
        // (Some javadoc output includes this empty table.)
        //
        if(rows.length == 1) {
            return;
        }

        //
        // Shallow menus (The menu param is a "menupopup" and the child is 
        //                  a "menuitem")
        // Simply append the first child.
        //
        menuPopup.appendChild(child);

        //
        // Deep menus   (The menu param is a "menupopup" and the child 
        //                  param is a "menu".)
        // Once the first child is appended, we now add the menupopup
        // for that menu child.
        //
        if(javadocmozplugin.DEEP_MENUS == true) {
            // For deep menus, add another menupopup and append to that.
            menuPopup = document.createElement("menupopup");
            child.appendChild(menuPopup);
        } 


        //
        // Skip first table row, it contains header stuff.
        // Start at index 1.
        //
        for(var i = 1; i < rows.length; i++) {
    
            //
            // Only use direct children of the top table.
            // No nested table tr's.
            //
            var parent = rows[i].parentNode;
            while(  parent != null && 
                    parent.nodeName.toUpperCase() != "TABLE") {
                parent = parent.parentNode;
            }
            if( parent != topTable ) {
                // javadocmozplugin.debug("Skipping row " + i);
                continue;
            }

            var tds = rows[i].getElementsByTagName("td");
           
            var methodSig = "";
            var anchor = "";
         
            //
            // Filter out tds which are not direct children of
            // the top level table because these td's can contain
            // nested tables which subsequently contain more nested td's
            //
            var directChildren = [];
            for(var j = 0; j < tds.length; j++) {
                parent = tds[j].parentNode;
                while(  parent != null && 
                        parent.nodeName.toUpperCase() != "TABLE") {
                    // javadocmozplugin.debug(
                    //                "parentNode.nodeName " + parent.nodeName);
                    parent = parent.parentNode;
                }
                if(parent == null) {
                    // This shouldn't be. No table parent for td.
                }
                if(parent == topTable) {
                    // Top level, include it
                    directChildren.push(tds[j]);
                    // javadocmozplugin.debug("Adding td " + tds[j]);
                }
                // javadocmozplugin.debug("Ignoring td " + tds[j]);
            }
            
            for(var j = 0; j < directChildren.length; j++) {
                var code = directChildren[j].getElementsByTagName("code")[0];
                methodSig += " " + code.textContent;

                if(j == directChildren.length-1) {
                    // Last table td will have the anchor
                    anchor = 
                        directChildren[j].getElementsByTagName("a")[0].href;
                    anchor = anchor.substring( anchor.indexOf("#") + 1 );
                }
            }

            var text = methodSig;

            text = text.replace(/&lt;/g, "<");
            text = text.replace(/&gt;/g, ">");
            text = text.replace(/&amp;/g, "&");
            text = text.replace(/&\w+?;/g, " ");
            text = text.replace(/\s+/g, " ");

            var menuitem = document.createElement("menuitem");
            menuitem.setAttribute("label", text);
            menuPopup.appendChild(menuitem);

            javadocmozplugin.addClickEventForExternalLink( 
                                            menuitem,
                                            url + "#" + anchor );
        } 
      
    },

    /**
     * Load a class page from the javadoc html and populate 
     *      the menu passed in.
     *
     * @param menu  The menu on which to populate submenus from
     *              the class page content (fields, constructors, methods)
     * @param url   The url of the javadoc class page
     * @param id    A unique id within our results for this class
     */
    loadClassPage: function(menu, url, id) {

        //
        // Clear children
        //
        while(menu.firstChild) {
            menu.removeChild(menu.firstChild);
        }

        //
        // Create menupopup for field menu, constr menu, method menu
        //
        var menuPopup = document.createElement("menupopup");
        menuPopup.setAttribute("id", "javadocmozplugin-classpopup-"+id);
        menu.appendChild(menuPopup);

        var httpRequest = new XMLHttpRequest();
        httpRequest.open('GET', url, true);
        httpRequest.onreadystatechange = function() {

            if (httpRequest.readyState === 4 && httpRequest.status === 200) {

                //
                // Get HTML from http response
                //
                var html = httpRequest.responseText;     
                
                //
                // Crop the relative portion of html
                //
                html = html.replace(
                        /[\s\S]+<!--\s+=+ START OF CLASS DATA =+ -->/, "");
                html = html.replace(
                        /<!--\s+=+ END OF CLASS DATA =+[\s\S]+/, "");

                //
                // Some "constants"...
                //
                var FIELD_SUMMARY = 
                                    "=========== FIELD SUMMARY ===========";
                var CONSTRUCTOR_SUMMARY = 
                                    "======== CONSTRUCTOR SUMMARY ========";
                var METHOD_SUMMARY = 
                                    "========== METHOD SUMMARY ===========";

                var menuChild = null;

                //
                // If shallow menus are configured, use menu items,
                // Otherwise create a new level of menu
                //
                var itemType = "menuitem";
                if(javadocmozplugin.DEEP_MENUS == true) {
                    itemType = "menu";
                }

                if(html.indexOf(FIELD_SUMMARY) != -1) {

                    var fieldSummary = html.substring(
                                            html.indexOf(FIELD_SUMMARY) );

                    var nextSection = "fields_inherited_from_";
                    if(fieldSummary.indexOf(nextSection) == -1) {
                        nextSection = CONSTRUCTOR_SUMMARY;
                        if(fieldSummary.indexOf(nextSection) == -1) {
                            nextSection = METHOD_SUMMARY;
                        }
                    }

                    var nextTableIndex = fieldSummary.indexOf("<table");
                    if( nextTableIndex == -1) {
                        nextTableIndex = fieldSummary.indexOf("<TABLE");
                    }

                    if( nextTableIndex != -1 &&
                        nextTableIndex < fieldSummary.indexOf(nextSection) ) {

                        menuChild = document.createElement(itemType);
                        menuChild.setAttribute("label", "Fields");
                        if(javadocmozplugin.DEEP_MENUS == false) {
                            menuChild.setAttribute("class", "header");
                        }
                        menuChild.setAttribute( "id", 
                                            "javadocmozplugin-fieldmenu-"+id);
                        javadocmozplugin.addClickEventForExternalLink( 
                                            menuChild,
                                            url + "#field_summary" );
                        
                        javadocmozplugin.populateClassMemberMenuItems(
                                                            menuPopup, 
                                                            menuChild,
                                                            fieldSummary, 
                                                            url);
                    } 
                }

                if(html.indexOf(CONSTRUCTOR_SUMMARY) != -1) {

                    var constSummary = html.substring(
                                            html.indexOf(CONSTRUCTOR_SUMMARY) );

                    var nextTableIndex = constSummary.indexOf("<table");
                    if( nextTableIndex == -1) {
                        nextTableIndex = constSummary.indexOf("<TABLE");
                    }

                    if( nextTableIndex != -1 &&
                        nextTableIndex < constSummary.indexOf(METHOD_SUMMARY) ) {

                        menuChild = document.createElement(itemType);
                        menuChild.setAttribute("label", "Constructors");
                        if(javadocmozplugin.DEEP_MENUS == false) {
                            menuChild.setAttribute("class", "header");
                        }
                        menuChild.setAttribute( "id", 
                                            "javadocmozplugin-constmenu-"+id);
                        javadocmozplugin.addClickEventForExternalLink( 
                                            menuChild,
                                            url + "#constructor_summary" );

                        javadocmozplugin.populateClassMemberMenuItems(
                                                            menuPopup, 
                                                            menuChild,
                                                            constSummary, 
                                                            url);
                    }

                }

                if(html.indexOf(METHOD_SUMMARY) != -1) {

                    var methodSummary = html.substring(
                                            html.indexOf(METHOD_SUMMARY) );

                    if( methodSummary.indexOf("<table") > -1 ||
                        methodSummary.indexOf("<TABLE") > -1 ) {

                        menuChild = document.createElement(itemType);
                        menuChild.setAttribute("label", "Methods");
                        if(javadocmozplugin.DEEP_MENUS == false) {
                            menuChild.setAttribute("class", "header");
                        }
                        menuChild.setAttribute( "id", 
                                            "javadocmozplugin-methodmenu-"+id);
                        javadocmozplugin.addClickEventForExternalLink( 
                                            menuChild,
                                            url + "#method_summary" );

                        javadocmozplugin.populateClassMemberMenuItems(
                                                            menuPopup, 
                                                            menuChild,
                                                            methodSummary, 
                                                            url);
                    }
                }

            } else {
                // Not loaded. Check for errors?
            }

        }
        httpRequest.send();
 
    },

    /**
     *
     * Load the javadoc pages and init other prefs.
     *
     */
    initDocPages: function() {
    
        // alert("Re-Loading javadocs");

        javadocmozplugin.javadocs = {};

        javadocmozplugin.DEEP_MENUS = 
                    javadocmozplugin.prefs.getBoolPref("deepmenu");
        javadocmozplugin.SEARCH_STRICT = 
                    javadocmozplugin.prefs.getBoolPref("searchstrict");
        javadocmozplugin.VERBOSE_CLASSNAME = 
                    javadocmozplugin.prefs.getBoolPref("verboseclassname");

        var MAX_DOC_PAGES = 5;

        for(var i = 1; i < MAX_DOC_PAGES+1; i++) {
            try {
                var docObj = new Object();

                docObj.url     = javadocmozplugin.prefs.getCharPref("url"+i);
                docObj.name    = javadocmozplugin.prefs.getCharPref("name"+i);
                docObj.enabled = javadocmozplugin.prefs.getBoolPref(
                                                            "enabled"+i);
                docObj.loaded   = false;

                if(docObj.url != null && docObj.url !== "") {

                    if(docObj.enabled === true) {
                        // alert("Enabling " + docObj.url);
                        javadocmozplugin.docObjMap[docObj.url] = docObj;
                        javadocmozplugin.initDocPage(docObj.url);
                    }
                }

            } catch(e) {
                // alert(e);
            }
        }

    },

    /**
     *
     * Load a javadoc page containing all classes.
     *
     * @param baseUrl The base url of a javadoc web page
     *
     */
    initDocPage: function(baseUrl) {
        
        var docObj = javadocmozplugin.docObjMap[baseUrl];

        if(docObj.loaded == true) {
            // alert("Doc already loaded.");
            // Doc already loaded.
            return;
        }
        
        var allClassesUrl = baseUrl + "/" + javadocmozplugin.ALL_CLASSES_PAGE;
        
        var httpRequest = new XMLHttpRequest();
        httpRequest.open('GET', allClassesUrl, true);

        httpRequest.onreadystatechange = function() {
           
            var docObj = javadocmozplugin.docObjMap[baseUrl];

            if(docObj.loaded == true) {
                // Doc already loaded. Ignore this.
                return;
            }

            if (httpRequest.readyState === 4 && httpRequest.status === 200) {

                javadocmozplugin.javadocs[baseUrl] = httpRequest.responseText;
                docObj.loaded = true;

            } else {

                // Doc not ready yet ...

            }

        }
        httpRequest.send();
 
    },

    /**
     * Initialize the extension.
     */
    initExt: function() {

        //
        // Remove init function event listener
        //
        window.removeEventListener("load", javadocmozplugin.init, false);

        //
        // Obtain reference to the context menu to install a listener.
        //
        var ctxMenu = document.getElementById(
                                        "contentAreaContextMenu");
      
        //
        // Add a listener for when the context menu pops up (right click)
        //
        ctxMenu.addEventListener("popupshowing", 

            //
            // Handle right click. Check if any text in the content area
            // is selected. Extract it. Attempt to determine if it
            // is a java class name.
            //
            function(e) {
                if(this.id != e.target.id) {
                    return;
                }

                javadocmozplugin.clearSubMenu();

                var subMenu = document.getElementById(
                                       "javadocmozplugin-context-submenu");

                //
                // Make sure remote html page of classes was loaded.
                //
                // if(javadocmozplugin.docLoaded == false) {
                //    // Nothing to do until this is ready.
                //    subMenu.hidden = true;
                //    return;
                // } 

                if( gContextMenu.isContentSelected ||
                    gContextMenu.onTextInput ) {

                    subMenu.hidden = false;
                    var selection = "";

                    //
                    // See if the selection is not from page content but from
                    // an input widget. (textarea, input)
                    //
                    if(content.document.activeElement &&
                        content.document.activeElement.selectionStart !=
                        content.document.activeElement.selectionEnd) {

                        // Get selection from input widget

                        selection = content.document.activeElement.value;
                        selection = selection.substring(
                            content.document.activeElement.selectionStart,
                            content.document.activeElement.selectionEnd );

                    } else {

                        //
                        // Get selection from document content
                        //
                        selection = content.getSelection();

                        // Convert selection to string 
                        selection = selection.toString();

                        //
                        // Handle selection from frames.
                        // Cases where selection is still an empty string
                        // at this point.
                        //
                        for(var i = 0;
                                selection == "" && i < content.frames.length;
                                i++) {

                            selection = 
                                content.frames[i].getSelection().toString();
                        }

                    }

                    // Trim selection
                    selection = selection.replace(/^\s+|\s+$/g,'');

                    var matches = javadocmozplugin.search(selection);

                    if(matches.length > 0) {
                        javadocmozplugin.populateClassSubMenu(matches);
                    } else {
                        javadocmozplugin.addSingleSubMenuItem(
                                                    "No class " + selection);
                    }

                    return;
                } 

                // Nothing selected? Hide the javadoc menu item
                subMenu.hidden = true;
            } 

        );


        //
        // Get our preferences
        //
        try {
            javadocmozplugin.prefs = 
                Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch("extensions.javadocmozplugin.");
            javadocmozplugin.prefs.QueryInterface(
                                    Components.interfaces.nsIPrefBranch2);

            //
            // This observer pattern for pref changes is horrible.
            // Don't really need to be notified every time a single 
            // character in a string changes. Would be ncie to have
            // some kind of atomic transaction with an event/notification
            // from an "OK" or "Apply" button. 
            //
            // Instead, ask user to restart browser after making changing.
            //
            /*
            javadocmozplugin.prefs.addObserver("", {
                observe: function(subject, topic, data) {
                        if (topic != "nsPref:changed") {
                            return;
                        }

                        // javadocmozplugin.stalePrefs = true;
                    }
                
                }, false);
            */

        } catch(e) {
            // Can't load prefs??
            // alert(e);
        }

        //
        // Load the javadoc html documents
        //
        javadocmozplugin.initDocPages();


    }

}


//
// Initialize javadoc lookup 
//
window.addEventListener("load", 
                        javadocmozplugin.initExt,
                        false);

