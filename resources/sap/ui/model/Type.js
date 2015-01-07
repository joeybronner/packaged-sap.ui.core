/*!
 * SAP UI development toolkit for HTML5 (SAPUI5/OpenUI5)
 * (c) Copyright 2009-2015 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the base implementation for all model implementations
sap.ui.define(['jquery.sap.global', 'sap/ui/base/Object'],
	function(jQuery, BaseObject) {
	"use strict";


	/**
	 * Constructor for a new Type.
	 *
	 * @class
	 * This is an abstract base class for type objects.
	 * @abstract
	 *
	 * @extends sap.ui.base.Object
	 *
	 * @author SAP SE
	 * @version 1.26.3
	 *
	 * @constructor
	 * @public
	 * @alias sap.ui.model.Type
	 */
	var Type = BaseObject.extend("sap.ui.model.Type", /** @lends sap.ui.model.Type.prototype */ {
		
		constructor : function () {
			BaseObject.apply(this, arguments);
			this.sName = "Type";
		},
	
		metadata : {
			"abstract" : true,
			publicMethods : [
			// methods
			"getName"
		  ]
		}
		
	});
	
	
	/**
	 * Returns the name of this type.
	 *
	 * @return {String} the name of this type
	 * @public
	 */
	Type.prototype.getName = function() {
		return this.sName;
	};

	return Type;

}, /* bExport= */ true);
