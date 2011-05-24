YUI.add('model', function(Y) {

/**
Attribute-based data model with APIs for getting, setting, validating, and
syncing attribute values, as well as events for being notified of model changes.

In most cases, you'll want to create your own subclass of `Y.Model` and
customize it to meet your needs. In particular, the `sync()`, `url()`, and
`validate()` methods are meant to be overridden by custom implementations.
You may also want to override the `parse()` method to parse non-generic server
responses.

@module model
@class Model
@constructor
@uses Base
**/

var GlobalEnv = YUI.namespace('Env.Model'),
    JSON      = Y.JSON || JSON,
    Lang      = Y.Lang,
    YObject   = Y.Object,

    /**
    Fired when one or more attributes on this model are changed.

    @event change
    @param {Object} new New values for the attributes that were changed.
    @param {Object} prev Previous values for the attributes that were changed.
    @param {String} src Source of the change event.
    **/
    EVT_CHANGE = 'change',

    /**
    Fired when an error occurs, such as when the model doesn't validate or when
    a server response can't be parsed.

    @event error
    @param {String} type Type of error that occurred. May be one of the
      following:

        - `parse`: An error parsing a JSON response.
        - `validate`: The model failed to validate.

    @param {mixed} error Error message, object, or exception generated by the
      error. Calling `toString()` on this should result in a meaningful error
      message.
    **/
    EVT_ERROR = 'error';

function Model() {
    Model.superclass.constructor.apply(this, arguments);
}

Y.Model = Y.extend(Model, Y.Base, {
    // -- Public Properties ----------------------------------------------------

    /**
    Hash of attributes that have changed since the last time this model was
    saved.

    @property changed
    @type Object
    @default {}
    **/

    /**
    Name of the attribute to use as the unique id (or primary key) for this
    model.

    The default is `id`, but if your persistence layer uses a different name for
    the primary key (such as `_id` or `uid`), you can specify that here.

    The built-in `id` attribute will always be an alias for whatever attribute
    name you specify here, so getting and setting `id` will always behave the
    same as getting and setting your custom id attribute.

    @property idAttribute
    @type String
    @default `'id'`
    **/
    idAttribute: 'id',

    /**
    Hash of attributes that were changed in the last `change` event. Each item
    in this hash is an object with the following properties:

      - `newVal`: The new value of the attribute after it changed.
      - `prevVal`: The old value of the attribute before it changed.
      - `src`: The source of the change, or `null` if no source was specified.

    @property lastChange
    @type Object
    @default {}
    **/

    /**
    `ModelList` instance that contains this model, or `null` if this model is
    not contained by a list.

    This property is set automatically when a model is added to or removed from
    a `ModelList` instance. You shouldn't need to set it manually. When working
    with models in a list, you should always add and remove models using the
    lists `add()` and `remove()` methods.

    @property list
    @type ModelList
    @default `null`
    **/

    // -- Lifecycle Methods ----------------------------------------------------
    initializer: function (config) {
        this.changed    = {};
        this.lastChange = {};
    },

    // TODO: destructor?

    // -- Public Methods -------------------------------------------------------

    /**
    Deletes this model on the server and removes it from its containing list, if
    any.

    This method delegates to the `sync()` method to perform the actual delete
    operation, which is an asynchronous action. Specify a _callback_ function to
    be notified of success or failure.

    @method delete
    @param {Object} [options] Sync options. It's up to the custom sync
      implementation to determine what options it supports or requires, if any.
    @param {callback} [callback] Called when the sync operation finishes.
      @param {Error|null} callback.err If an error occurred, this parameter will
        contain the error. If the sync operation succeeded, _err_ will be
        `null`.
    @chainable
    **/
    'delete': function (options, callback) {
        var self = this;

        // Allow callback as only arg.
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        this.sync('delete', options, function (err) {
            if (!err && self.list) {
                self.list.remove(self);
            }

            callback && callback.apply(null, arguments);
        });

        return this;
    },

    /**
    Returns a clientId string that's unique among all models on the current page
    (even models in other YUI instances). Uniqueness across pageviews is
    unlikely.

    @method generateClientId
    @return {String} Unique clientId.
    **/
    generateClientId: function () {
        GlobalEnv.lastId || (GlobalEnv.lastId = 0);
        return 'c' + (GlobalEnv.lastId += 1);
    },

    /**
    Returns the value of the specified attribute.

    If the attribute's value is an object, _name_ may use dot notation to
    specify the path to a specific property within the object, and the value of
    that property will be returned.

    @example
        // Set the 'foo' attribute to an object.
        myModel.set('foo', {
            bar: {
                baz: 'quux'
            }
        });

        // Get the value of 'foo'.
        myModel.get('foo');
        // => {bar: {baz: 'quux'}}

        // Get the value of 'foo.bar.baz'.
        myModel.get('foo.bar.baz');
        // => 'quux'

    @method get
    @param {String} name Attribute name or object property path.
    @return {mixed} Attribute value, or `undefined` if the attribute doesn't
      exist.
    **/

    // get() is defined by Y.Attribute.

    /**
    Returns an HTML-escaped version of the value of the specified string
    attribute. The value is escaped using `Y.Escape.html()`.

    @method getAsHTML
    @param {String} name Attribute name or object property path.
    @return {String} HTML-escaped attribute value.
    **/
    getAsHTML: function (name) {
        var value = this.get(name);
        return Y.Escape.html(Lang.isValue(value) ? String(value) : '');
    },

    /**
    Returns a URL-encoded version of the value of the specified string
    attribute. The value is encoded using the native `encodeURIComponent()`
    function.

    @method getAsURL
    @param {String} name Attribute name or object property path.
    @return {String} URL-encoded attribute value.
    **/
    getAsURL: function (name) {
        var value = this.get(name);
        return encodeURIComponent(Lang.isValue(value) ? String(value) : '');
    },

    /**
    Returns `true` if any attribute of this model has been changed since the
    model was last saved.

    New models (models for which `isNew()` returns `true`) are implicitly
    considered to be "modified" until the first time they're saved.

    @method isModified
    @return {Boolean} `true` if this model has changed since it was last saved,
      `false` otherwise.
    **/
    isModified: function () {
        return this.isNew() || !YObject.isEmpty(this.changed);
    },

    /**
    Returns `true` if this model is "new", meaning it hasn't been saved since it
    was created.

    Newness is determined by checking whether the model's `id` attribute has
    been set. An empty id is assumed to indicate a new model, whereas a
    non-empty id indicates a model that was either loaded or has been saved
    since it was created.

    @method isNew
    @return {Boolean} `true` if this model is new, `false` otherwise.
    **/
    isNew: function () {
        return !Lang.isValue(this.get('id'));
    },

    /**
    Loads this model from the server.

    This method delegates to the `sync()` method to perform the actual load
    operation, which is an asynchronous action. Specify a _callback_ function to
    be notified of success or failure.

    If the load operation succeeds and one or more of the loaded attributes
    differ from this model's current attributes, a `change` event will be fired.

    @method load
    @param {Object} [options] Options to be passed to `sync()` and to `set()`
      when setting the loaded attributes. It's up to the custom sync
      implementation to determine what options it supports or requires, if any.
    @param {callback} [callback] Called when the sync operation finishes.
      @param {Error|null} callback.err If an error occurred, this parameter will
        contain the error. If the sync operation succeeded, _err_ will be
        `null`.
      @param {mixed} callback.response The server's response. This value will
        be passed to the `parse()` method, which is expected to parse it and
        return an attribute hash.
    @chainable
    **/
    load: function (options, callback) {
        var self = this;

        // Allow callback as only arg.
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        this.sync('read', options, function (err, response) {
            if (!err) {
                self.setAttrs(self.parse(response), options);
                self.changed = {};
            }

            callback && callback.apply(null, arguments);
        });

        return this;
    },

    /**
    Called to parse the _response_ when the model is loaded from the server.
    This method receives a server _response_ and is expected to return an
    attribute hash.

    The default implementation assumes that _response_ is either an attribute
    hash or a JSON string that can be parsed into an attribute hash. If
    _response_ is a JSON string and either `Y.JSON` or the native `JSON` object
    are available, it will be parsed automatically. If a parse error occurs, an
    `error` event will be fired and the model will not be updated.

    You may override this method to implement custom parsing logic if necessary.

    @method parse
    @param {mixed} response Server response.
    @return {Object} Attribute hash.
    **/
    parse: function (response) {
        if (typeof response === 'string') {
            if (JSON) {
                try {
                    return JSON.parse(response);
                } catch (ex) {
                    this.fire(EVT_ERROR, {
                        type : 'parse',
                        error: ex
                    });

                    return null;
                }
            } else {
                this.fire(EVT_ERROR, {
                    type : 'parse',
                    error: 'Unable to parse response.'
                });

                Y.error("Can't parse JSON response because the json-parse "
                        + "module isn't loaded.");

                return null;
            }
        }

        return response;
    },

    /**
    Saves this model to the server.

    This method delegates to the `sync()` method to perform the actual save
    operation, which is an asynchronous action. Specify a _callback_ function to
    be notified of success or failure.

    If the save operation succeeds and one or more of the attributes returned in
    the server's response differ from this model's current attributes, a
    `change` event will be fired.

    @method save
    @param {Object} [options] Options to be passed to `sync()` and to `set()`
      when setting synced attributes. It's up to the custom sync implementation
      to determine what options it supports or requires, if any.
    @param {callback} [callback] Called when the sync operation finishes.
      @param {Error|null} callback.err If an error occurred, this parameter will
        contain the error. If the sync operation succeeded, _err_ will be
        `null`.
      @param {mixed} callback.response The server's response. This value will
        be passed to the `parse()` method, which is expected to parse it and
        return an attribute hash.
    @chainable
    **/
    save: function (options, callback) {
        var self = this;

        // Allow callback as only arg.
        if (typeof options === 'function') {
            callback = options;
            options  = {};
        }

        this.sync(this.isNew() ? 'create' : 'update', options, function (err, response) {
            if (!err && response) {
                self.setAttrs(self.parse(response), options);
                self.changed = {};
            }

            callback && callback.apply(null, arguments);
        });

        return this;
    },

    /**
    Sets the value of a single attribute. If model validation fails, the
    attribute will not be set and an `error` event will be fired.

    Use `setAttrs()` to set multiple attributes at once.

    @example
        model.set('foo', 'bar');

    @method set
    @param {String} name Attribute name or object property path.
    @param {any} value Value to set.
    @param {Object} [options] Data to be mixed into the event facade of the
        `change` event(s) for these attributes.
      @param {Boolean} [options.silent=false] If `true`, no `change` event will
          be fired.
    @chainable
    **/
    set: function (name, value, options) {
        var attributes = {};
        attributes[name] = value;

        return this.setAttrs(attributes);
    },

    /**
    Sets the values of multiple attributes at once. If model validation fails,
    the attributes will not be set and an `error` event will be fired.

    @example
        model.setAttrs({
            foo: 'bar',
            baz: 'quux'
        });

    @method setAttrs
    @param {Object} attributes Hash of attribute names and values to set.
    @param {Object} [options] Data to be mixed into the event facade of the
        `change` event(s) for these attributes.
      @param {Boolean} [options.silent=false] If `true`, no `change` event will
          be fired.
    @chainable
    **/
    setAttrs: function (attributes, options) {
        var changed     = this.changed,
            idAttribute = this.idAttribute,
            e, key, lastChange, transaction;

        if (!this._validate(attributes)) {
            return this;
        }

        options || (options = {});
        transaction = options._transaction = {};

        if (idAttribute !== 'id') {
            // When a custom id attribute is in use, always keep the default
            // `id` attribute in sync.
            if (YObject.owns(attributes, idAttribute)) {
                attributes.id = attributes[idAttribute];
            } else if (YObject.owns(attributes, 'id')) {
                attributes[idAttribute] = attributes.id;
            }
        }

        for (key in attributes) {
            if (YObject.owns(attributes, key)) {
                this._setAttr(key, attributes[key], options);
            }
        }

        if (!options.silent && !Y.Object.isEmpty(transaction)) {
            lastChange = this.lastChange = {};

            for (key in transaction) {
                if (YObject.owns(transaction, key)) {
                    e = transaction[key];

                    changed[key] = e.newVal;

                    lastChange[key] = {
                        newVal : e.newVal,
                        prevVal: e.prevVal,
                        src    : e.src || null
                    };
                }
            }

            // Lazy publish for the change event.
            if (!this._changeEvent) {
                this._changeEvent = this.publish(EVT_CHANGE, {
                    preventable: false
                });
            }

            this.fire(EVT_CHANGE, {changed: lastChange});
        }

        return this;
    },

    /**
    Override this method to provide a custom persistence implementation for this
    model. The default just calls the callback without actually doing anything.

    This method is called internally by `load()`, `save()`, and `delete()`.

    @method sync
    @param {String} action Sync action to perform. May be one of the following:

      - `create`: Store a newly-created model for the first time.
      - `delete`: Delete an existing model.
      - 'read'  : Load an existing model.
      - `update`: Update an existing model.

    @param {Object} [options] Sync options. It's up to the custom sync
      implementation to determine what options it supports or requires, if any.
    @param {callback} [callback] Called when the sync operation finishes.
      @param {Error|null} callback.err If an error occurred, this parameter will
        contain the error. If the sync operation succeeded, _err_ will be
        falsy.
      @param {mixed} [callback.response] The server's response. This value will
        be passed to the `parse()` method, which is expected to parse it and
        return an attribute hash.
    **/
    sync: function (/* action, options, callback */) {
        var callback = Y.Array(arguments, 0, true).pop();

        if (typeof callback === 'function') {
            callback();
        }
    },

    /**
    Returns a copy of this model's attributes that can be passed to
    `Y.JSON.stringify()` or used for other nefarious purposes.

    The `clientId` attribute is not included in the returned object.

    If you've specified a custom attribute name in the `idAttribute` property,
    the default `id` attribute will not be included in the returned object.

    @method toJSON
    @return {Object} Copy of this model's attributes.
    **/
    toJSON: function () {
        var attrs = this.getAttrs();

        delete attrs.clientId;
        delete attrs.destroyed;
        delete attrs.initialized;

        if (this.idAttribute !== 'id') {
            delete attrs.id;
        }

        return attrs;
    },

    /**
    Reverts the last change to the model.

    If an _attrNames_ array is provided, then only the named attributes will be
    reverted (and only if they were modified in the previous change). If no
    _attrNames_ array is provided, then all changed attributes will be reverted
    to their previous values.

    Note that only one level of undo is available: from the current state to the
    previous state. If `undo()` is called when no previous state is available,
    it will simply do nothing and return `true`.

    @method undo
    @param {Array} [attrNames] Array of specific attribute names to rever. If
      not specified, all attributes modified in the last change will be
      reverted.
    @param {Object} [options] Data to be mixed into the event facade of the
        change event(s) for these attributes.
      @param {Boolean} [options.silent=false] If `true`, no `change` event will
          be fired.
    @return {Boolean} `true` if validation succeeded and the attributes were set
      successfully, `false` otherwise.
    **/
    undo: function (attrNames, options) {
        var lastChange  = this.lastChange,
            idAttribute = this.idAttribute,
            toUndo      = {},
            needUndo;

        attrNames || (attrNames = YObject.keys(lastChange));

        Y.Array.each(attrNames, function (name) {
            if (YObject.owns(lastChange, name)) {
                // Don't generate a double change for custom id attributes.
                name = name === idAttribute ? 'id' : name;

                needUndo     = true;
                toUndo[name] = lastChange[name].prevVal;
            }
        });

        if (needUndo) {
            return this.setAttrs(toUndo, options);
        }

        return true;
    },

    /**
    Override this method to return a URL corresponding to this model's location
    on the server. The default implementation simply returns an empty string.

    The URL returned by this method will be used to make requests to the server
    or other persistence layer when this model is saved and loaded.

    @method url
    @return {String} URL for this model.
    **/
    url: function () { return ''; },

    /**
    Override this method to provide custom validation logic for this model.
    While attribute-specific validators can be used to validate individual
    attributes, this method gives you a hook to validate a hash of attributes
    when multiple attributes are changed at once. This method is called
    automatically before `set`, `setAttrs`, and `save` take action.

    A call to `validate` that doesn't return anything will be treated as a
    success. If the `validate` method returns a value, it will be treated as a
    failure, and the returned value (which may be a string or an object
    containing information about the failure) will be passed along to the
    `error` event.

    @method validate
    @param {Object} attributes Attribute hash containing changed attributes.
    @return {mixed} Any return value other than `undefined` or `null` will be
      treated as a validation failure.
    **/
    validate: function (/* attributes */) {},

    // -- Protected Methods ----------------------------------------------------

    /**
    Calls the public, overridable `validate()` method and fires an `error` event
    if validation fails.

    @method _validate
    @param {Object} attributes Attribute hash.
    @return {Boolean} `true` if validation succeeded, `false` otherwise.
    @protected
    **/
    _validate: function (attributes) {
        var error = this.validate(attributes);

        if (Lang.isValue(error)) {
            // Validation failed. Fire an error.
            this.fire(EVT_ERROR, {
                type      : 'validate',
                attributes: attributes,
                error     : error
            });

            return false;
        }

        return true;
    },

    // -- Protected Event Handlers ---------------------------------------------

    /**
    Duckpunches the `_defAttrChangeFn()` provided by `Y.Attribute` so we can
    have a single global notification when a change event occurs.

    @method _defAttrChangeFn
    @param {EventFacade} e
    @protected
    **/
    _defAttrChangeFn: function (e) {
        if (!this._setAttrVal(e.attrName, e.subAttrName, e.prevVal, e.newVal)) {
            // Prevent "after" listeners from being invoked since nothing changed.
            e.stopImmediatePropagation();
        } else {
            e.newVal = this.get(e.attrName);

            if (e._transaction) {
                e._transaction[e.attrName] = e;
            }
        }
    }
}, {
    NAME: 'model',

    ATTRS: {
        /**
        A client-only identifier for this model.

        Like the `id` attribute, `clientId` may be used to retrieve model
        instances from lists. Unlike the `id` attribute, `clientId` is
        automatically generated, and is only intended to be used on the client
        during the current pageview.

        @attribute clientId
        @type String
        @readOnly
        **/
        clientId: {
            valueFn : 'generateClientId',
            readOnly: true
        },

        /**
        A unique identifier for this model. Among other things, this id may be
        used to retrieve model instances from lists, so it should be unique.

        If the id is empty, this model instance is assumed to represent a new
        item that hasn't yet been saved.

        If you would prefer to use a custom attribute as this model's id instead
        of using the `id` attribute (for example, maybe you'd rather use `_id`
        or `uid` as the primary id), you may set the `idAttribute` property to
        the name of your custom id attribute. The `id` attribute will then
        act as an alias for your custom attribute.

        @attribute id
        @type String|Number|null
        @default `null`
        **/
        id: {value: null}
    }
});


}, '@VERSION@' ,{optional:['json-parse'], requires:['base-build', 'escape']});
