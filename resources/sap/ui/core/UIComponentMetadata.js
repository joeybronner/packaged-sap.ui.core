/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2015 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.ComponentMetadata
sap.ui.define(['jquery.sap.global', './ComponentMetadata'],
	function(jQuery, ComponentMetadata) {
	"use strict";


	/**
	 * Creates a new metadata object for a UIComponent subclass.
	 *
	 * @param {string} sClassName Fully qualified name of the class that is described by this metadata object
	 * @param {object} oStaticInfo Static info to construct the metadata from
	 *
	 * @experimental Since 1.15.1. The Component concept is still under construction, so some implementation details can be changed in future.
	 * @class
	 * @author SAP SE
	 * @version 1.34.1
	 * @since 1.15.1
	 * @alias sap.ui.core.UIComponentMetadata
	 */
	var UIComponentMetadata = function(sClassName, oClassInfo) {

		// call super constructor
		ComponentMetadata.apply(this, arguments);

	};

	//chain the prototypes
	UIComponentMetadata.prototype = jQuery.sap.newObject(ComponentMetadata.prototype);

	UIComponentMetadata.preprocessClassInfo = function(oClassInfo) {
		// if the component is a string we convert this into a "_src" metadata entry
		// the specific metadata object can decide to support this or gracefully ignore it
		// basically the ComponentMetadata makes use of this feature
		if (oClassInfo && typeof oClassInfo.metadata === "string") {
			oClassInfo.metadata = {
				_src: oClassInfo.metadata
			};
		}
		return oClassInfo;
	};

	/**
	 * Returns the root view of the component.
	 * @param {boolean} [bDoNotMerge] Returns the local root view configuration if set to <code>true</code>.
	 * @return {object} root view as configuration object or null ({@link sap.ui.view})
	 * @protected
	 * @since 1.15.1
	 * @experimental Since 1.15.1. Implementation might change.
	 * @deprecated Since 1.27.1. Please use the sap.ui.core.ComponentMetadata#getManifest
	 */
	UIComponentMetadata.prototype.getRootView = function(bDoNotMerge) {
		return this._getAndMergeEntry(bDoNotMerge, "rootView", "getRootView");
	};

	/**
	 * Returns the routing section.
	 * @return {object} routing section
	 * @private
	 */
	UIComponentMetadata.prototype._getRoutingSection = function(bDoNotMerge) {
		return this._getAndMergeEntry(bDoNotMerge, "routing", "_getRoutingSection");
	};


	/**
	 * Returns the routing configuration.
	 * @return {object} routing configuration
	 * @private
	 * @since 1.16.1
	 * @experimental Since 1.16.1. Implementation might change.
	 * @deprecated Since 1.27.1. Please use the sap.ui.core.ComponentMetadata#getManifest
	 */
	UIComponentMetadata.prototype.getRoutingConfig = function(bDoNotMerge) {
		var oRoutingSection = this._getRoutingSection(bDoNotMerge);
		return oRoutingSection && oRoutingSection.config;
	};

	/**
	 * Returns the array of routes. If not defined the array is undefined.
	 * @return {array} routes
	 * @private
	 * @since 1.16.1
	 * @experimental Since 1.16.1. Implementation might change.
	 * @deprecated Since 1.27.1. Please use the sap.ui.core.ComponentMetadata#getManifest
	 */
	UIComponentMetadata.prototype.getRoutes = function(bDoNotMerge) {
		var oRoutingSection = this._getRoutingSection(bDoNotMerge);
		return oRoutingSection && oRoutingSection.routes;
	};


		/**
		 * Returns the config entry and merges it if doNotMerge is false.
		 * @param bDoNotMerge true = merge with parent
		 * @param sEntry entry in the manifest
		 * @param sFunctionName getter function of the parent
		 * @returns {null|*}
		 * @private
		 */
	UIComponentMetadata.prototype._getAndMergeEntry = function(bDoNotMerge, sEntry, sFunctionName) {
		var oParent,
			oUI5Manifest = this.getManifestEntry("sap.ui5"),
			mObject = jQuery.extend(true, {}, oUI5Manifest && oUI5Manifest[sEntry]);

		if (!bDoNotMerge && (oParent = this.getParent()) instanceof UIComponentMetadata) {
			// merge the root view object if defined via parameter
			mObject = jQuery.extend(true, {}, oParent[sFunctionName](bDoNotMerge), mObject);
		}

		// in case of no root view is defined the object is empty
		return jQuery.isEmptyObject(mObject) ? null : mObject;
	};

	/**
	 * Converts the legacy metadata into the new manifest format
	 *
	 * @private
	 */
	UIComponentMetadata.prototype._convertLegacyMetadata = function(oStaticInfo, oManifest) {
		ComponentMetadata.prototype._convertLegacyMetadata.call(this, oStaticInfo, oManifest);

		// add the old information on component metadata to the manifest info
		// if no manifest entry exists otherwise the metadata entry will be
		// ignored by the converter
		var oUI5Manifest = oManifest["sap.ui5"];
		var oRootView = oUI5Manifest["rootView"] || oStaticInfo["rootView"];
		if (oRootView) {
			oUI5Manifest["rootView"] = oRootView;
		}
		var oRouting = oUI5Manifest["routing"] || oStaticInfo["routing"];
		if (oRouting) {
			oUI5Manifest["routing"] = oRouting;
		}

		// if the root view is a string we convert it into a view
		// configuration object and assume that it is a XML view
		// !This should be kept in sync with the UIComponent#createContent functionality!
		if (oUI5Manifest["rootView"] && typeof oUI5Manifest["rootView"] === "string") {
			oUI5Manifest["rootView"] = {
				viewName: oUI5Manifest["rootView"],
				type: sap.ui.core.mvc.ViewType.XML
			};
		}

	};

	return UIComponentMetadata;

}, /* bExport= */ true);
