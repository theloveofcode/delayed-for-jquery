/*
    Delayed for jQuery - A plug-in to delay and/or debounce event handlers
    http://www.theloveofcode.com/jquery/delayed/
    https://github.com/theloveofcode/delayed-for-jquery
    Copyright 2012 Tyler Vigeant <tyler@theloveofcode.com>
    Released under the MIT and GPL licenses.
    Version 1.1.0
*/
(function( $ ) {
    TLOC_Delayed = {
        functions: {},
        arguments: {},
        originals: {},
        debounce_threshhold: 100,

        delayed: function ( types, params, selector, data, fn, one ) {
            var origFn, type;

            // Types can be a map of types/handlers
            if ( typeof types === "object" ) {
                // ( types-Object, selector, data )
                if ( typeof selector !== "string" ) { // && selector != null
                    // ( types-Object, data )
                    data = data || selector;
                    selector = undefined;
                }
                for ( type in types ) {
                    this.delayed( type, selector, data, types[ type ] );
                }
                return this;
            }

            if ( data == null && fn == null ) {
                // ( types, fn )
                fn = selector;
                data = selector = undefined;
            } else if ( fn == null ) {
                if ( typeof selector === "string" ) {
                    // ( types, selector, fn )
                    fn = data;
                    data = undefined;
                } else {
                    // ( types, data, fn )
                    fn = data;
                    data = selector;
                    selector = undefined;
                }
            }
            if ( fn === false ) {
                fn = returnFalse;
            } else if ( !fn ) {
                return this;
            }
            if ( typeof params != 'object' ) {
                params = {delay: params};
            }

            if ( typeof params.delay == 'undefined' ) {
                return false;
            }

            // Clone the function
            origFn = fn;

            fn = function( event ) {
                // Emulate build in event methods
                if ( params.preventDefault ) { event.preventDefault(); }
                if ( params.stopPropagation ) { event.stopPropagation(); }
                if ( params.stopImmediatePropagation ) { event.stopImmediatePropagation(); }

                // Store the arguments so that they can be called from the function below
                TLOC_Delayed.arguments[ origFn.guid ] = [this, arguments];

                // If the delay is set to a string of 'debounce'
                // replace that value with the plugin's default debounce threshhold
                if ( params.delay == 'debounce' ) {
                    window.clearTimeout( TLOC_Delayed.functions[ origFn.guid ] );
                    delay_ms = TLOC_Delayed.debounce_threshhold;
                } else {
                    delay_ms = params.delay;
                }

                if ( one === 1 ) {
                    jQuery().off( event );
                } else if ( one === 'first' ) {
                    $(event.delegateTarget).removeDelay( types, selector, fn );
                }

                TLOC_Delayed.functions[ origFn.guid ] = window.setTimeout(function() {
                    return origFn.apply(
                        TLOC_Delayed.arguments[ origFn.guid ][0],
                        TLOC_Delayed.arguments[ origFn.guid ][1]
                    );
                }, delay_ms);
            };

            // Use same guid so caller can remove using origFn
            fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );

            // Store the original function so that we can rebind this later with removeDelay
            TLOC_Delayed.originals[ fn.guid ] = origFn;

            return this.each( function() {
                jQuery.event.add( this, types, fn, data, selector );
            });
        },

        delayedOne: function ( types, params, selector, data, fn ) {
            return this.delayed( types, params, selector, data, fn, 1 );
        },

        delayedFirst: function ( types, params, selector, data, fn ) {
            return this.delayed( types, params, selector, data, fn, 'first' );
        },

        get_events: function( elem, types, selector, fn ) {
            var events = [],
                rtypenamespace = /^([^\.]*)?(?:\.(.+))?$/,
                elemEvents = (parseFloat($().jquery) < 1.8) ? $(elem).data('events') : $._data(elem, 'events');

            if ( selector === false || typeof selector === "function" ) {
                // ( types [, fn] )
                fn = selector;
                selector = undefined;
            }
            if ( fn === false ) {
                fn = returnFalse;
            }

            // Once for each type.namespace in types; type may be omitted
            types = types.replace(/(?:^|\s)hover(\.\S+)?\b/, "mouseenter$1 mouseleave$1") || "";
            types = jQuery.trim( types ).split(" ");

            for ( var t = 0; t < types.length; t++ ) {
                tns = rtypenamespace.exec( types[t] ) || [];
                type = origType = tns[1];

                // Support for mouseenter and mouseleave
                if (type == 'mouseenter') {
                    type = 'mouseover';
                    origType = 'mouseenter';
                } else if (type == 'mouseleave') {
                    type = 'mouseout';
                    origType = 'mouseleave';
                } else {
                    origType = false;
                }
                
                eventType = elemEvents[ type ] || [];

                for ( var i in eventType ) {
                    e = eventType[i];

                    if ( (origType && origType == e.origType) || !origType) {
                        if ( e.namespace == tns[2] || typeof(tns[2]) == 'undefined' ) {
                            if ( selector ) {
                                if ( e.selector == selector ) {
                                    if ( fn ) {
                                        if ( e.handler == fn ) {
                                             events.push(e); 
                                        }
                                    } else {
                                       events.push(e); 
                                    }
                                }
                            } else {
                                events.push(e); 
                            }
                        }
                    }
                }
            }

            return events;
        },

        get_event_guids: function( elem, types, selector, fn ) {
            var guids = [],
                events = TLOC_Delayed.get_events( elem, types, selector, fn );

            for ( var i in events ) {
                e = events[i];
                guids.push(e.guid);
            }

            return guids;
        },

        removeDelay: function( types, selector, fn ) {
            if ( typeof types === "object" ) {
                // ( types-object [, selector] )
                for ( var type in types ) {
                    this.removeDelay( type, selector, types[ type ] );
                }
                return this;
            }

            // Return "this" so that methods can be chained
            return this.each(function() {
                var events = TLOC_Delayed.get_events( this, types, selector, fn );

                for ( var i in events ) {
                    e = events[i];
                    e.handler = TLOC_Delayed.originals[ e.guid ];
                }
            });
        },

        stopDelayed: function( types, selector, fn ) {
            if ( typeof types === "object" ) {
                // ( types-object [, selector] )
                for ( var type in types ) {
                    this.stopDelayed( type, selector, types[ type ] );
                }
                return this;
            }

            // Return "this" so that methods can be chained
            return this.each(function() {
                var guids = TLOC_Delayed.get_event_guids( this, types, selector, fn );

                for ( var i in guids ) {
                    clearTimeout( TLOC_Delayed.functions[ guids[i] ] );
                }
            });
        },

        debounce: function( types, selector, data, fn ) {
            // Return "this" so that methods can be chained
            return this.each(function() {
                $(this).delayed( types, 'debounce', selector, data, fn );
            });
        }
    };

    $.fn.delayed = function( method ) {
        return TLOC_Delayed['delayed'].apply( this, arguments ); 
    };

    $.fn.delayedOne = function( method ) {
        return TLOC_Delayed['delayedOne'].apply( this, arguments ); 
    };

    $.fn.delayedFirst = function( method ) {
        return TLOC_Delayed['delayedFirst'].apply( this, arguments ); 
    };

    $.fn.removeDelay = function( method ) {
        return TLOC_Delayed['removeDelay'].apply( this, arguments ); 
    };

    $.fn.stopDelayed = function( method ) {
        return TLOC_Delayed['stopDelayed'].apply( this, arguments ); 
    };

    $.fn.debounce = function( method ) {
        return TLOC_Delayed['debounce'].apply( this, arguments ); 
    };
})( jQuery );