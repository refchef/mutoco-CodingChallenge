
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Navbar.svelte generated by Svelte v3.44.0 */

    const file$4 = "src/Navbar.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let h1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Event App";
    			add_location(h1, file$4, 1, 4, 25);
    			attr_dev(div, "class", "navbar");
    			add_location(div, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navbar', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/Trennlinie.svelte generated by Svelte v3.44.0 */

    const file$3 = "src/Trennlinie.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let hr;

    	const block = {
    		c: function create() {
    			div = element("div");
    			hr = element("hr");
    			add_location(hr, file$3, 1, 1, 32);
    			attr_dev(div, "class", "contentContainer");
    			add_location(div, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, hr);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Trennlinie', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Trennlinie> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Trennlinie extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trennlinie",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/Reminder.svelte generated by Svelte v3.44.0 */

    const file$2 = "src/Reminder.svelte";

    function create_fragment$2(ctx) {
    	let div7;
    	let div6;
    	let t0;
    	let div5;
    	let div0;
    	let t2;
    	let div1;
    	let t4;
    	let div3;
    	let button0;
    	let t6;
    	let div2;
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let button1;
    	let t12;
    	let div4;
    	let input0;
    	let t13;
    	let span;
    	let t15;
    	let input1;
    	let t16;
    	let script;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div6 = element("div");
    			t0 = text("Set a check back reminder\n\n        ");
    			div5 = element("div");
    			div0 = element("div");
    			div0.textContent = "DD.MM.YYYY";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "13:00";
    			t4 = space();
    			div3 = element("div");
    			button0 = element("button");
    			button0.textContent = "–";
    			t6 = space();
    			div2 = element("div");
    			t7 = text("in ");
    			t8 = text(/*days*/ ctx[0]);
    			t9 = text(" Days");
    			t10 = space();
    			button1 = element("button");
    			button1.textContent = "+";
    			t12 = space();
    			div4 = element("div");
    			input0 = element("input");
    			t13 = space();
    			span = element("span");
    			span.textContent = "50";
    			t15 = space();
    			input1 = element("input");
    			t16 = space();
    			script = element("script");
    			script.textContent = "let d = new Date();\n\n        let day = d.getDate();\n        let month = d.getMonth() + 1; \n        var year = d.getFullYear();\n\n        let currentDate = day + \".\" + month + \".\" + year;\n        document.getElementById(\"eventDate\").innerHTML = currentDate;\n\n        function ValidateEmail(input) {\n            var validRegex =\n                /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$/;\n\n            if (input.value.match(validRegex)) {\n                alert(\"Valid email address!\");\n\n                document.email.focus();\n\n                return true;\n            } else {\n                alert(\"Invalid email address!\");\n\n                document.email.focus();\n\n                return false;\n            }\n        }\n\n        console.log(currentDate);\n\n        function countChars(obj) {\n            var maxLength = 50;\n            var strLength = obj.value.length;\n            var charRemain = maxLength - strLength;\n\n            if (charRemain < 0) {\n                document.getElementById(\"counter\").innerHTML =\n                    '<span style=\"color: red;\">You have exceeded the limit of ' +\n                    maxLength +\n                    \" characters</span>\";\n            } else {\n                document.getElementById(\"counter\").innerHTML = charRemain;\n            }\n        }";
    			attr_dev(div0, "id", "eventDate");
    			add_location(div0, file$2, 12, 12, 279);
    			attr_dev(div1, "id", "eventTime");
    			add_location(div1, file$2, 14, 12, 329);
    			attr_dev(button0, "id", "minusDay");
    			attr_dev(button0, "onclick", "decreaseValue()");
    			attr_dev(button0, "class", "btn");
    			add_location(button0, file$2, 17, 16, 413);
    			add_location(div2, file$2, 23, 16, 618);
    			attr_dev(button1, "id", "plusDay");
    			attr_dev(button1, "onclick", "increaseValue()");
    			attr_dev(button1, "class", "btn");
    			add_location(button1, file$2, 24, 16, 660);
    			attr_dev(div3, "id", "daysToEvent");
    			add_location(div3, file$2, 16, 12, 374);
    			attr_dev(input0, "class", "inputField");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "name", "email");
    			attr_dev(input0, "placeholder", "Enter your email");
    			attr_dev(input0, "maxlength", "50");
    			attr_dev(input0, "onkeyup", "countChars(this);");
    			attr_dev(input0, "onclick", "ValidateEmail(document.email)");
    			add_location(input0, file$2, 33, 16, 920);
    			attr_dev(span, "id", "counter");
    			add_location(span, file$2, 42, 16, 1260);
    			attr_dev(div4, "class", "wrapperInput");
    			add_location(div4, file$2, 32, 12, 877);
    			attr_dev(input1, "id", "submitButton");
    			attr_dev(input1, "type", "submit");
    			attr_dev(input1, "name", "validate");
    			input1.value = "Submit";
    			add_location(input1, file$2, 45, 12, 1321);
    			attr_dev(div5, "id", "submitForm");
    			add_location(div5, file$2, 11, 8, 245);
    			attr_dev(div6, "class", "reminder");
    			add_location(div6, file$2, 8, 4, 179);
    			add_location(script, file$2, 53, 4, 1503);
    			attr_dev(div7, "class", "reminderContainer");
    			add_location(div7, file$2, 7, 0, 143);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div6);
    			append_dev(div6, t0);
    			append_dev(div6, div5);
    			append_dev(div5, div0);
    			append_dev(div5, t2);
    			append_dev(div5, div1);
    			append_dev(div5, t4);
    			append_dev(div5, div3);
    			append_dev(div3, button0);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			append_dev(div2, t7);
    			append_dev(div2, t8);
    			append_dev(div2, t9);
    			append_dev(div3, t10);
    			append_dev(div3, button1);
    			append_dev(div5, t12);
    			append_dev(div5, div4);
    			append_dev(div4, input0);
    			append_dev(div4, t13);
    			append_dev(div4, span);
    			append_dev(div5, t15);
    			append_dev(div5, input1);
    			append_dev(div7, t16);
    			append_dev(div7, script);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*removeDay*/ ctx[2], false, false, false),
    					listen_dev(button1, "click", /*addDay*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*days*/ 1) set_data_dev(t8, /*days*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Reminder', slots, []);
    	let days = 0;
    	let addDay = () => $$invalidate(0, days += 1);
    	let removeDay = () => $$invalidate(0, days -= 1);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Reminder> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ days, addDay, removeDay });

    	$$self.$inject_state = $$props => {
    		if ('days' in $$props) $$invalidate(0, days = $$props.days);
    		if ('addDay' in $$props) $$invalidate(1, addDay = $$props.addDay);
    		if ('removeDay' in $$props) $$invalidate(2, removeDay = $$props.removeDay);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [days, addDay, removeDay];
    }

    class Reminder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Reminder",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Event.svelte generated by Svelte v3.44.0 */

    const file$1 = "src/Event.svelte";

    function create_fragment$1(ctx) {
    	let div8;
    	let div0;
    	let t1;
    	let div2;
    	let t2;
    	let t3;
    	let div1;
    	let t5;
    	let div7;
    	let div3;
    	let t7;
    	let div5;
    	let t8;
    	let div4;
    	let t12;
    	let div6;

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div0 = element("div");
    			div0.textContent = `${/*eventLocation*/ ctx[1]}`;
    			t1 = space();
    			div2 = element("div");
    			t2 = text(/*event*/ ctx[0]);
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = `${/*eventTag*/ ctx[2]}`;
    			t5 = space();
    			div7 = element("div");
    			div3 = element("div");
    			div3.textContent = `${/*eventDescribtion*/ ctx[3]}`;
    			t7 = space();
    			div5 = element("div");
    			t8 = text("Event Date\n            ");
    			div4 = element("div");
    			div4.textContent = `${/*eventDate*/ ctx[4]}   |   ${/*eventTime*/ ctx[5]}`;
    			t12 = space();
    			div6 = element("div");
    			attr_dev(div0, "class", "eventLocation");
    			add_location(div0, file$1, 12, 4, 605);
    			attr_dev(div1, "id", "eventTag");
    			add_location(div1, file$1, 15, 8, 707);
    			attr_dev(div2, "class", "eventTitle");
    			add_location(div2, file$1, 13, 4, 658);
    			attr_dev(div3, "class", "eventDescribtion");
    			add_location(div3, file$1, 19, 8, 789);
    			attr_dev(div4, "class", "eventTime");
    			add_location(div4, file$1, 23, 12, 915);
    			attr_dev(div5, "class", "eventDetails");
    			add_location(div5, file$1, 21, 8, 853);
    			attr_dev(div6, "class", "eventPhotoContainer");
    			add_location(div6, file$1, 28, 8, 1038);
    			attr_dev(div7, "class", "wrapper");
    			add_location(div7, file$1, 18, 4, 759);
    			attr_dev(div8, "class", "contentContainer");
    			add_location(div8, file$1, 11, 0, 570);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div0);
    			append_dev(div8, t1);
    			append_dev(div8, div2);
    			append_dev(div2, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div8, t5);
    			append_dev(div8, div7);
    			append_dev(div7, div3);
    			append_dev(div7, t7);
    			append_dev(div7, div5);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div7, t12);
    			append_dev(div7, div6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Event', slots, []);
    	let event = "The Rolling Stones";
    	let eventLocation = "Letzigrund Stadion, Zurich";
    	let eventTag = "top event";
    	let eventDescribtion = "The stones roll through Europe this winter - The Rolling Stones will play at the Letzigrund stadium on Friday, Dec 17 2021. On their “On Fire” tour, they will also make a stop in Zurich at the beginning of the winter... A heater and ticket prices are not yet known. We will inform you here and on social media. So check back from time to time.";
    	let eventDate = "Fri 17. Dez";
    	let eventTime = "18:00 PM";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Event> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		event,
    		eventLocation,
    		eventTag,
    		eventDescribtion,
    		eventDate,
    		eventTime
    	});

    	$$self.$inject_state = $$props => {
    		if ('event' in $$props) $$invalidate(0, event = $$props.event);
    		if ('eventLocation' in $$props) $$invalidate(1, eventLocation = $$props.eventLocation);
    		if ('eventTag' in $$props) $$invalidate(2, eventTag = $$props.eventTag);
    		if ('eventDescribtion' in $$props) $$invalidate(3, eventDescribtion = $$props.eventDescribtion);
    		if ('eventDate' in $$props) $$invalidate(4, eventDate = $$props.eventDate);
    		if ('eventTime' in $$props) $$invalidate(5, eventTime = $$props.eventTime);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [event, eventLocation, eventTag, eventDescribtion, eventDate, eventTime];
    }

    class Event extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Event",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.44.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let navbar;
    	let t0;
    	let event;
    	let t1;
    	let trennlinie;
    	let t2;
    	let reminder;
    	let current;
    	navbar = new Navbar({ $$inline: true });
    	event = new Event({ $$inline: true });
    	trennlinie = new Trennlinie({ $$inline: true });
    	reminder = new Reminder({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			create_component(event.$$.fragment);
    			t1 = space();
    			create_component(trennlinie.$$.fragment);
    			t2 = space();
    			create_component(reminder.$$.fragment);
    			add_location(main, file, 7, 0, 186);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_dev(main, t0);
    			mount_component(event, main, null);
    			append_dev(main, t1);
    			mount_component(trennlinie, main, null);
    			append_dev(main, t2);
    			mount_component(reminder, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(event.$$.fragment, local);
    			transition_in(trennlinie.$$.fragment, local);
    			transition_in(reminder.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(event.$$.fragment, local);
    			transition_out(trennlinie.$$.fragment, local);
    			transition_out(reminder.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			destroy_component(event);
    			destroy_component(trennlinie);
    			destroy_component(reminder);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Navbar, Trennlinie, Reminder, Event });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
