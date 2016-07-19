/*!
 * ${copyright}
 */
sap.ui.require([
	"jquery.sap.global",
	"sap/ui/model/Context",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/odata/v4/_ODataHelper",
	"sap/ui/model/odata/v4/lib/_Cache",
	"sap/ui/model/odata/v4/lib/_Helper",
	"sap/ui/model/odata/v4/lib/_Parser",
	"sap/ui/model/Sorter"
], function (jQuery, Context, Filter, FilterOperator, _ODataHelper, _Cache, _Helper, _Parser,
		Sorter) {
	/*global QUnit, sinon */
	/*eslint no-warning-comments: 0 */
	"use strict";

	/**
	 * Clones the given object
	 *
	 * @param {any} v the object
	 * @returns {any} the clone
	 */
	function clone(v) {
		return v && JSON.parse(JSON.stringify(v));
	}

	//*********************************************************************************************
	QUnit.module("sap.ui.model.odata.v4._ODataHelper", {
		beforeEach : function () {
			this.oLogMock = sinon.mock(jQuery.sap.log);
			this.oLogMock.expects("warning").never();
			this.oLogMock.expects("error").never();
		},

		afterEach : function () {
			this.oLogMock.verify();
		}
	});

	//*********************************************************************************************
	[{
		sKeyPredicate : "('42')",
		oEntityInstance : {"ID" : "42"},
		oEntityType : {
			"$Key" : ["ID"],
			"ID" : {
				"$Type" : "Edm.String"
			}
		}
	}, {
		sKeyPredicate : "('Walter%22s%20Win''s')",
		oEntityInstance : {"ID" : "Walter\"s Win's"},
		oEntityType : {
			"$Key" : ["ID"],
			"ID" : {
				"$Type" : "Edm.String"
			}
		}
	}, {
		sKeyPredicate : "(Sector='DevOps',ID='42')",
		oEntityInstance : {"ID" : "42", "Sector" : "DevOps"},
		oEntityType : {
			"$Key" : ["Sector", "ID"],
			"Sector" : {
				"$Type" : "Edm.String"
			},
			"ID" : {
				"$Type" : "Edm.String"
			}
		}
	}, {
		sKeyPredicate : "(Bar=42,Fo%3Do='Walter%22s%20Win''s')",
		oEntityInstance : {
			"Bar" : 42,
			"Fo=o" : "Walter\"s Win's"
		},
		oEntityType : {
			"$Key" : ["Bar", "Fo=o"],
			"Bar" : {
				"$Type" : "Edm.Int16"
			},
			"Fo=o" : {
				"$Type" : "Edm.String"
			}
		}
	}].forEach(function (oFixture) {
		QUnit.test("getKeyPredicate: " + oFixture.sKeyPredicate, function (assert) {
			var sProperty;

			this.spy(_Helper, "formatLiteral");

			assert.strictEqual(
				_ODataHelper.getKeyPredicate(oFixture.oEntityType, oFixture.oEntityInstance),
				oFixture.sKeyPredicate);

			// check that _Helper.formatLiteral() is called for each property
			for (sProperty in oFixture.oEntityType) {
				if (sProperty[0] !== "$") {
					assert.ok(
						_Helper.formatLiteral.calledWithExactly(
							oFixture.oEntityInstance[sProperty],
							oFixture.oEntityType[sProperty].$Type),
						_Helper.formatLiteral.printf(
							"_Helper.formatLiteral('" + sProperty + "',...) %C"));
				}
			}
		});
	});
	//TODO handle keys with aliases!

	//*********************************************************************************************
	[{
		sDescription : "one key property",
		oEntityInstance : {},
		oEntityType : {
			"$Key" : ["ID"],
			"ID" : {
				"$Type" : "Edm.String"
			}
		}
	}, {
		sDescription : "multiple key properties",
		oEntityInstance : {"Sector" : "DevOps"},
		oEntityType : {
			"$Key" : ["Sector", "ID"],
			"Sector" : {
				"$Type" : "Edm.String"
			},
			"ID" : {
				"$Type" : "Edm.String"
			}
		}
	}].forEach(function (oFixture) {
		QUnit.test("getKeyPredicate: missing key, " + oFixture.sDescription, function (assert) {
			var sError = "Missing value for key property 'ID'";

			assert.throws(function () {
				_ODataHelper.getKeyPredicate(oFixture.oEntityType, oFixture.oEntityInstance);
			}, new Error(sError));
		});
	});

	//*********************************************************************************************
	QUnit.test("getKeyPredicate: no instance", function (assert) {
		var sError = "No instance to calculate key predicate";

		assert.throws(function () {
			_ODataHelper.getKeyPredicate({
				$Key : ["ID"]
			}, undefined);
		}, new Error(sError));
	});

	//*********************************************************************************************
	[{
		mModelOptions : {"sap-client" : "111"},
		mOptions : {"$expand" : {"foo" : null}, "$select" : ["bar"], "custom" : "baz"},
		aAllowed : ["$expand", "$select"]
	}, {
		mModelOptions : {"custom" : "bar"},
		mOptions : {"custom" : "foo"},
		aAllowed : []
	}, {
		mModelOptions : undefined,
		mOptions : undefined,
		aAllowed : undefined
	}, {
		mModelOptions : null,
		mOptions : {"sap-client" : "111"},
		aAllowed : null,
		bSapAllowed : true
	}].forEach(function (o) {
		QUnit.test("buildQueryOptions success " + JSON.stringify(o), function (assert) {
			var mOptions,
				mOriginalModelOptions = clone(o.mModelOptions),
				mOriginalOptions = clone(o.mOptions);

			mOptions = _ODataHelper.buildQueryOptions(o.mModelOptions, o.mOptions, o.aAllowed,
				o.bSapAllowed);

			assert.deepEqual(mOptions, jQuery.extend({}, o.mModelOptions, o.mOptions));
			assert.deepEqual(o.mModelOptions, mOriginalModelOptions);
			assert.deepEqual(o.mOptions, mOriginalOptions);
		});
	});

	//*********************************************************************************************
	QUnit.test("buildQueryOptions with $$ options", function (assert) {
		assert.deepEqual(_ODataHelper.buildQueryOptions({}, {$$groupId : "$direct"}), {});
	});

	//*********************************************************************************************
	QUnit.test("buildQueryOptions: parse system query options", function (assert) {
		var oExpand = {"foo" : true},
			oParserMock = this.mock(_Parser),
			aSelect = ["bar"];

		oParserMock.expects("parseSystemQueryOption")
			.withExactArgs("$expand=foo").returns({"$expand" : oExpand});
		oParserMock.expects("parseSystemQueryOption")
			.withExactArgs("$select=bar").returns({"$select" : aSelect});

		assert.deepEqual(_ODataHelper.buildQueryOptions({}, {
			$expand : "foo",
			$select : "bar"
		}, ["$expand", "$select"]), {
			$expand : oExpand,
			$select : aSelect
		});
	});

	//*********************************************************************************************
	[{
		mModelOptions : {},
		mOptions : {"$foo" : "foo"},
		aAllowed : ["$expand", "$select"],
		error : "System query option $foo is not supported"
	}, {
		mModelOptions : {},
		mOptions : {"@alias" : "alias"},
		aAllowed : ["$expand", "$select"],
		error : "Parameter @alias is not supported"
	}, {
		mModelOptions : undefined,
		mOptions : {"$expand" : {"foo" : true}},
		aAllowed : undefined,
		error : "System query option $expand is not supported"
	}, {
		mModelOptions : undefined,
		mOptions : {"$expand" : {"foo" : {"$select" : "bar"}}},
		aAllowed : ["$expand"],
		error : "System query option $select is not supported"
	}, {
		mModelOptions : undefined,
		mOptions : {"$expand" : {"foo" : {"select" : "bar"}}},
		aAllowed : ["$expand", "$select"],
		error : "System query option select is not supported"
	}, {
		mModelOptions : undefined,
		mOptions : {"sap-foo" : "300"},
		aAllowed : undefined,
		error : "Custom query option sap-foo is not supported"
	}].forEach(function (o) {
		QUnit.test("buildQueryOptions error " + JSON.stringify(o), function (assert) {
			assert.throws(function () {
				_ODataHelper.buildQueryOptions(o.mModelOptions, o.mOptions, o.aAllowed);
			}, new Error(o.error));
		});
	});

	//*********************************************************************************************
	QUnit.test("buildBindingParameters, $$groupId", function (assert) {
		var aAllowedParams = ["$$groupId"];

		assert.deepEqual(_ODataHelper.buildBindingParameters(undefined), {});
		assert.deepEqual(_ODataHelper.buildBindingParameters({}), {});
		assert.deepEqual(_ODataHelper.buildBindingParameters({$$groupId : "$auto"}, aAllowedParams),
			{$$groupId : "$auto"});
		assert.deepEqual(_ODataHelper.buildBindingParameters(
			{$$groupId : "$direct", custom : "foo"}, aAllowedParams), {$$groupId : "$direct"});

		assert.throws(function () {
			_ODataHelper.buildBindingParameters({$$unsupported : "foo"});
		}, new Error("Unsupported binding parameter: $$unsupported"));

		assert.throws(function () {
			_ODataHelper.buildBindingParameters({$$groupId : ""}, aAllowedParams);
		}, new Error("Unsupported value '' for binding parameter '$$groupId'"));
		assert.throws(function () {
			_ODataHelper.buildBindingParameters({$$groupId : "~invalid"}, aAllowedParams);
		}, new Error("Unsupported value '~invalid' for binding parameter '$$groupId'"));
		assert.throws(function () {
			_ODataHelper.buildBindingParameters({$$groupId : "$auto"});
		}, new Error("Unsupported binding parameter: $$groupId"));
	});

	//*********************************************************************************************
	QUnit.test("buildBindingParameters, $$operationMode", function (assert) {
		var aAllowedParams = ["$$operationMode"];

		assert.throws(function () {
			_ODataHelper.buildBindingParameters({$$operationMode : "Client"}, aAllowedParams);
		}, new Error("Unsupported operation mode: Client"));
		assert.throws(function () {
			_ODataHelper.buildBindingParameters({$$operationMode : "Auto"}, aAllowedParams);
		}, new Error("Unsupported operation mode: Auto"));
		assert.throws(function () {
			_ODataHelper.buildBindingParameters({$$operationMode : "any"}, aAllowedParams);
		}, new Error("Unsupported operation mode: any"));

		assert.deepEqual(_ODataHelper.buildBindingParameters({$$operationMode : "Server"},
				aAllowedParams),
			{$$operationMode : "Server"});
	});

	//*********************************************************************************************
	QUnit.test("buildBindingParameters, $$updateGroupId", function (assert) {
		var aAllowedParams = ["$$updateGroupId"];

		assert.deepEqual(_ODataHelper.buildBindingParameters({$$updateGroupId : "myGroup"},
				aAllowedParams),
			{$$updateGroupId : "myGroup"});
		assert.deepEqual(_ODataHelper.buildBindingParameters(
			{$$updateGroupId : "$direct", custom : "foo"}, aAllowedParams),
			{$$updateGroupId : "$direct"});

		assert.throws(function () {
			_ODataHelper.buildBindingParameters({$$unsupported : "foo"}, aAllowedParams);
		}, new Error("Unsupported binding parameter: $$unsupported"));

		assert.throws(function () {
			_ODataHelper.buildBindingParameters({$$updateGroupId : "~invalid"}, aAllowedParams);
		}, new Error("Unsupported value '~invalid' for binding parameter '$$updateGroupId'"));
	});

	//*********************************************************************************************
	QUnit.test("checkGroupId", function (assert) {
		// valid group IDs
		_ODataHelper.checkGroupId("myGroup");
		_ODataHelper.checkGroupId("$auto");
		_ODataHelper.checkGroupId("$direct");
		_ODataHelper.checkGroupId(undefined);
		_ODataHelper.checkGroupId("myGroup", true);

		// invalid group IDs
		["", "$invalid", 42].forEach(function (vGroupId) {
			assert.throws(function () {
				_ODataHelper.checkGroupId(vGroupId);
			}, new Error("Invalid group ID: " + vGroupId));
		});

		// invalid application group IDs
		["", "$invalid", 42, "$auto", "$direct", undefined].forEach(function (vGroupId) {
			assert.throws(function () {
				_ODataHelper.checkGroupId(vGroupId, true);
			}, new Error("Invalid group ID: " + vGroupId));
		});

		// invalid group with custom message
		assert.throws(function () {
			_ODataHelper.checkGroupId("$invalid", false, "Custom error message: ");
		}, new Error("Custom error message: $invalid"));
	});

	//*********************************************************************************************
	[
		["/canonical1", undefined], //set context
		[undefined, "foo eq 42"], //set filter
		["/canonical2", "foo eq 42"] //set context and filter
	].forEach(function (oFixture) {
		QUnit.test("createCacheProxy: proxy interface, " + oFixture[0] + ", " + oFixture[1],
		function (assert) {
			var oBinding = {},
				oFilterPromise = oFixture[1] ? Promise.resolve(oFixture[1]) : undefined,
				oPathPromise = oFixture[0] ? Promise.resolve(oFixture[0]) : undefined,
				oCache = {
					read : function () {}
				},
				oCacheProxy,
				oReadResult = {},
				oReadPromise = Promise.resolve(oReadResult);

			function createCache(sPath, sFilter) {
				assert.strictEqual(sPath, oFixture[0]);
				assert.strictEqual(sFilter, oFixture[1]);
				return oCache;
			}

			this.mock(oCache).expects("read").withExactArgs("$auto", "foo").returns(oReadPromise);

			// code under test
			oCacheProxy = _ODataHelper.createCacheProxy(oBinding, createCache, oPathPromise,
				oFilterPromise);

			oBinding.oCache = oCacheProxy;
			assert.strictEqual(typeof oCacheProxy.deregisterChange, "function");
			assert.strictEqual(oCacheProxy.hasPendingChanges(), false);
			assert.strictEqual(typeof oCacheProxy.refresh, "function");
			assert.throws(function () {
				oCacheProxy.post();
			}, "POST request not allowed");
			assert.throws(function () {
				oCacheProxy.update();
			}, "PATCH request not allowed");

			return Promise.all([oCacheProxy.promise, oCacheProxy.read("$auto", "foo")])
				.then(function (aResult) {
					assert.strictEqual(aResult[0], oCache);
					assert.strictEqual(aResult[1], oReadResult);
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("createCacheProxy: deregister change listeners", function (assert) {
		var oBinding = {};

		// code under test
		_ODataHelper.createCacheProxy(oBinding, function () {});

		oBinding.oCache = { deregisterChange : function () {} };
		this.mock(oBinding.oCache).expects("deregisterChange").withExactArgs();

		// code under test
		_ODataHelper.createCacheProxy(oBinding, function () {});
	});

	//*********************************************************************************************
	QUnit.test("createCacheProxy: use same cache for same canonical path", function (assert) {
		var oBinding = {},
			oCache = {},
			oCacheProxy1,
			oCacheProxy2,
			createCache = this.spy(function () { return oCache; });

		// code under test
		oCacheProxy1 = _ODataHelper.createCacheProxy(oBinding, createCache, Promise.resolve("p"));

		oBinding.oCache = oCacheProxy1;
		return oCacheProxy1.promise.then(function (oCache1) {
			assert.strictEqual(oCache1, oCache);
			assert.strictEqual(createCache.callCount, 1);

			// code under test
			oCacheProxy2 = _ODataHelper.createCacheProxy(oBinding, createCache,
				Promise.resolve("p"));

			oBinding.oCache = oCacheProxy2;
			return oCacheProxy2.promise.then(function (oCache2) {
				assert.strictEqual(oCache2, oCache);
				assert.strictEqual(createCache.callCount, 1, "not called again");
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("createCacheProxy: create new cache for empty canonical path", function (assert) {
		var oBinding = {},
			oCacheProxy1,
			oCacheProxy2,
			createCache = this.spy(function () { return {}; });

		// code under test
		oCacheProxy1 = _ODataHelper.createCacheProxy(oBinding, createCache, undefined);

		oBinding.oCache = oCacheProxy1;
		return oCacheProxy1.promise.then(function (oCache1) {
			assert.strictEqual(createCache.callCount, 1);

			// code under test
			oCacheProxy2 = _ODataHelper.createCacheProxy(oBinding, createCache, undefined);

			oBinding.oCache = oCacheProxy2;
			return oCacheProxy2.promise.then(function (oCache2) {
				assert.strictEqual(createCache.callCount, 2, "called again");
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("createCacheProxy: cache proxy !== binding's cache", function (assert) {
		var oBinding = {};

		oBinding.oCache = { deregisterChange : function () {} };

		// code under test
		return _ODataHelper.createCacheProxy(
			oBinding,
			function () {
				assert.ok(false, "unexpected call to fnCreateCache");
			}
		).promise.then(function (oCache0) {
			assert.strictEqual(oCache0, oBinding.oCache);
		});
	});

	//*********************************************************************************************
	QUnit.test("createCacheProxy: requestCanonicalPath fails", function (assert) {
		var oBinding = {},
			oError = new Error("canonical path failure"),
			oCacheProxy;

		function unexpected () {
			assert.ok(false, "unexpected call");
		}

		// code under test
		oCacheProxy =  _ODataHelper.createCacheProxy(oBinding, unexpected, Promise.reject(oError));

		oCacheProxy.promise.then(unexpected, function (oError0) {
			assert.strictEqual(oError0, oError);
		});

		// code under test
		return oCacheProxy.read("$auto", "foo").catch(function (oError0) {
			assert.strictEqual(oError0.message,
				"Cannot read from cache, cache creation failed: " + oError);
		});
	});

	//*********************************************************************************************
	QUnit.test("createCacheProxy: requestFilter fails", function (assert) {
		var oBinding = {},
			oError = new Error("request filter failure"),
			oCacheProxy;

		function unexpected () {
			assert.ok(false, "unexpected call");
		}

		// code under test
		oCacheProxy =  _ODataHelper.createCacheProxy(oBinding, unexpected, undefined,
			Promise.reject(oError));

		oCacheProxy.promise.then(unexpected, function (oError0) {
			assert.strictEqual(oError0, oError);
		});

		// code under test
		return oCacheProxy.read("$auto", "foo").catch(function (oError0) {
			assert.strictEqual(oError0.message,
				"Cannot read from cache, cache creation failed: " + oError);
		});
	});

	//*********************************************************************************************
	[{
		bRelative : true,
		mQueryOptions : {$orderBy : "GrossAmount"}
	}, {
		bRelative : true,
		mQueryOptions : {$orderBy : "GrossAmount"},
		mInheritedQueryOptions : {$filter : "foo eq 'bar'", $orderBy : "GrossAmount"}
	}, {
		bRelative : true,
		mQueryOptions : {$filter : "foo eq 'bar'"},
		mInheritedQueryOptions : {$filter : "foo eq 'bar'", $orderBy : "GrossAmount"}
	}, {
		bRelative : true,
		aSorters : [{}]
	}, {
		bRelative : true,
		aApplicationFilters : [{}]
	}, {
		bRelative : true,
		aFilters : [{}]
	}, {
		bRelative : false,
		mQueryOptions : {$filter : "foo eq 'bar'"}
	}, {
		bRelative : false
	}].forEach(function (oFixture){
		QUnit.test("createListCacheProxy:" + JSON.stringify(oFixture), function (assert) {
			var sCanonicalPath = "/SalesOrderList('1')",
				sCachePath = sCanonicalPath.slice(1) + "/SO_2_SOITEMS",
				oBinding = {
					aApplicationFilters : oFixture.aApplicationFilters || [],
					aFilters : oFixture.aFilters || [],
					oModel : {oRequestor : {}},
					sPath : oFixture.bRelative ? "SO_2_SOITEMS" : "/" + sCachePath,
					mQueryOptions : oFixture.mQueryOptions,
					bRelative : oFixture.bRelative,
					aSorters : oFixture.aSorters || []
				},
				oContext,
				oCache = {},
				oCacheProxy = {
					promise : Promise.resolve(oCache)
				},
				sFilter = "field eq 'value'",
				oFilterPromise = Promise.resolve(sFilter),
				mMergedQueryOptions = {},
				sOrderBy = "BuyerName,GrossAmount",
				mQueryOptions = oFixture.mInheritedQueryOptions || oFixture.mQueryOptions,
				oPathPromise = oFixture.bRelative ? Promise.resolve(sCanonicalPath) : undefined;

			if (oFixture.bRelative) {
				oContext = {
					requestCanonicalPath : function () {}
				};
				this.mock(oContext).expects("requestCanonicalPath").withExactArgs()
					.returns(oPathPromise);
			}
			this.mock(_ODataHelper).expects("getQueryOptions")
				.withExactArgs(sinon.match.same(oBinding), "", sinon.match.same(oContext))
				.returns(mQueryOptions);
			this.mock(_ODataHelper).expects("requestFilter")
				.withExactArgs(sinon.match.same(oBinding),
					sinon.match.same(oBinding.aApplicationFilters),
					sinon.match.same(oBinding.aFilters),
					mQueryOptions && mQueryOptions.$filter)
				.returns(oFilterPromise);
			this.mock(_ODataHelper).expects("createCacheProxy")
				.withExactArgs(sinon.match.same(oBinding), sinon.match.func,
					sinon.match.same(oPathPromise), sinon.match.same(oFilterPromise))
				.callsArgWith(1, oContext ? sCanonicalPath : undefined, sFilter)
				.returns(oCacheProxy);
			this.mock(_ODataHelper).expects("buildOrderbyOption")
				.withExactArgs(sinon.match.same(oBinding.aSorters),
						mQueryOptions && mQueryOptions.$orderby)
				.returns(sOrderBy);
			this.mock(_ODataHelper).expects("mergeQueryOptions")
				.withExactArgs(sinon.match.same(mQueryOptions), sOrderBy, sFilter)
				.returns(mMergedQueryOptions);
			this.mock(_Helper).expects("buildPath")
				.withExactArgs(oContext ? sCanonicalPath : undefined, oBinding.sPath)
				.returns("/" + sCachePath);
			this.mock(_Cache).expects("create")
				.withExactArgs(sinon.match.same(oBinding.oModel.oRequestor), sCachePath,
					sinon.match.same(mMergedQueryOptions))
				.returns(oCache);

			// code under test
			assert.strictEqual(_ODataHelper.createListCacheProxy(oBinding, oContext), oCacheProxy);

			return oCacheProxy.promise.then(function () {
				assert.strictEqual(oBinding.oCache, oCache);
			});
		});
	});
	// TODO extend createListCacheProxy to createCollectionCache to be called everywhere ODLB
	// possibly needs a cache

	//*********************************************************************************************
	QUnit.test("createListCacheProxy: failure", function (assert) {
		var oBinding = {
				aApplicationFilters : [],
				aFilters : [],
				oModel : {
					reportError : function () {}
				},
				sPath : "SO_2_SOITEMS",
				aSorters : [{}],
				toString : function () {return "MyBinding";}
			},
			sCanonicalPath = "/~path~",
			oContext = {
				requestCanonicalPath : function () {}
			},
			oError = new Error("could not create cache"),
			oCacheProxy = {
				promise : Promise.reject(oError)
			},
			oPathPromise = Promise.resolve(sCanonicalPath);

		this.mock(_ODataHelper).expects("getQueryOptions").returns(undefined);
		this.mock(oContext).expects("requestCanonicalPath").withExactArgs().returns(oPathPromise);
		this.mock(_ODataHelper).expects("createCacheProxy").returns(oCacheProxy);
		this.mock(oBinding.oModel).expects("reportError")
			.withExactArgs("Failed to create cache for binding MyBinding",
				"sap.ui.model.odata.v4._ODataHelper", sinon.match.same(oError));

		// code under test
		oCacheProxy = _ODataHelper.createListCacheProxy(oBinding, oContext);

		return oCacheProxy.promise.catch(function () {});
	});

	//*********************************************************************************************
	QUnit.test("createListCacheProxy, nothing to do", function (assert) {
		var oBinding = {
				aApplicationFilters : [{}],
				aFilters : [{}],
				bRelative : true,
				aSorters : [{}]
			},
			oContext = {};

		this.mock(_ODataHelper).expects("createCacheProxy").never();

		// code under test
		assert.strictEqual(_ODataHelper.createListCacheProxy(oBinding, undefined), undefined,
			"unresolved relative binding");

		oBinding.aSorters = [];
		oBinding.aApplicationFilters = [];
		oBinding.aFilters = [];

		// code under test
		assert.strictEqual(_ODataHelper.createListCacheProxy(oBinding, oContext), undefined,
			"resolved relative binding, but no sorter");
	});

	//*********************************************************************************************
	QUnit.test("buildOrderbyOption", function (assert) {
		var sOrderby = "bar desc";

		// empty sorters
		assert.strictEqual(_ODataHelper.buildOrderbyOption([]), "");
		// array of sorters
		assert.strictEqual(_ODataHelper.buildOrderbyOption([new Sorter("foo")]), "foo",
			"Sorter array, no query option");
		assert.strictEqual(_ODataHelper.buildOrderbyOption([new Sorter("foo"),
			new Sorter("bar", true)]), "foo,bar desc");

		// with system query option $orderby
		// empty sorters
		assert.strictEqual(_ODataHelper.buildOrderbyOption([], sOrderby), sOrderby);
		// array of sorters
		assert.strictEqual(_ODataHelper.buildOrderbyOption([new Sorter("foo")], sOrderby),
			"foo," + sOrderby, "Sorter array, with query option");
		assert.strictEqual(_ODataHelper.buildOrderbyOption([new Sorter("foo"),
			new Sorter("baz", true)], sOrderby), "foo,baz desc," + sOrderby);
	});

	//*********************************************************************************************
	QUnit.test("buildOrderbyOption - error", function (assert) {
		// non Sorter instances throw error
		assert.throws(function () {
			_ODataHelper.buildOrderbyOption(["foo"]);
		}, new Error("Unsupported sorter: 'foo' (string)"));
		assert.throws(function () {
			_ODataHelper.buildOrderbyOption([new Sorter("foo"), "", new Sorter("bar", true)]);
		}, new Error("Unsupported sorter: '' (string)"));
		assert.throws(function () {
			_ODataHelper.buildOrderbyOption([new Sorter("foo"), 42, new Sorter("bar", true)]);
		}, new Error("Unsupported sorter: '42' (number)"));
	});

	//*********************************************************************************************
	QUnit.test("toArray", function (assert) {
		var oSorter = new Sorter("foo", true),
			aSorters = [oSorter];

		assert.deepEqual(_ODataHelper.toArray(), []);
		assert.deepEqual(_ODataHelper.toArray(null), []);
		assert.deepEqual(_ODataHelper.toArray(""), [""]);
		assert.deepEqual(_ODataHelper.toArray("foo"), ["foo"]);
		assert.deepEqual(_ODataHelper.toArray(oSorter), aSorters);
		assert.strictEqual(_ODataHelper.toArray(aSorters), aSorters);
	});

	//*********************************************************************************************
	QUnit.test("mergeQueryOptions", function (assert) {
		[{
			mQueryOptions: undefined,
			sOrderBy : undefined,
			sFilter : undefined
		}, {
			mQueryOptions: {$orderby : "bar", $select : "Name"},
			sOrderBy : undefined,
			sFilter : undefined
		}, {
			mQueryOptions: undefined,
			sOrderBy : "foo",
			sFilter : undefined,
			oResult : {$orderby : "foo"}
		}, {
			mQueryOptions: {$orderby : "bar", $select : "Name"},
			sOrderBy : "foo,bar",
			sFilter : undefined,
			oResult : {$orderby : "foo,bar", $select : "Name"}
		}, {
			mQueryOptions: {$orderby : "bar", $select : "Name"},
			sOrderBy : "bar",
			sFilter : undefined
		}, {
			mQueryOptions: undefined,
			sOrderBy : undefined,
			sFilter : "foo",
			oResult : {$filter : "foo"}
		}, {
			mQueryOptions: {$filter : "bar", $select : "Name"},
			sOrderBy : undefined,
			sFilter : "foo,bar",
			oResult : {$filter : "foo,bar", $select : "Name"}
		}, {
			mQueryOptions: {$filter: "bar", $select : "Name"},
			sOrderBy : undefined,
			sFilter : "bar"
		}, {
			mQueryOptions: {$filter: "bar", $orderby : "foo", $select : "Name"},
			sOrderBy : "foo",
			sFilter : "bar"
		}, {
			mQueryOptions: {$filter: "foo", $orderby : "bar", $select : "Name"},
			sOrderBy : "foo,bar",
			sFilter : "bar,baz",
			oResult : {$filter : "bar,baz", $orderby : "foo,bar", $select : "Name"}
		}].forEach(function (oFixture, i) {
			var oResult = _ODataHelper.mergeQueryOptions(oFixture.mQueryOptions,
					oFixture.sOrderBy, oFixture.sFilter);
			if ("oResult" in oFixture) {
				assert.deepEqual(oResult, oFixture.oResult, i);
			} else {
				assert.strictEqual(oResult, oFixture.mQueryOptions, i);
			}
			if (oResult) {
				assert.ok(oResult.$orderby || !("$orderby" in oResult), i + ": $orderby");
				assert.ok(oResult.$filter || !("$filter" in oResult), i + ": $filter");
			}
		});
	});

	//*********************************************************************************************
	[
		{op : FilterOperator.BT, result : "SupplierName ge 'SAP' and SupplierName le 'XYZ'"},
		{op : FilterOperator.EQ, result : "SupplierName eq 'SAP'"},
		{op : FilterOperator.GE, result : "SupplierName ge 'SAP'"},
		{op : FilterOperator.GT, result : "SupplierName gt 'SAP'"},
		{op : FilterOperator.LE, result : "SupplierName le 'SAP'"},
		{op : FilterOperator.LT, result : "SupplierName lt 'SAP'"},
		{op : FilterOperator.NE, result : "SupplierName ne 'SAP'"},
		{op : FilterOperator.Contains, result : "contains(SupplierName,'SAP')"},
		{op : FilterOperator.EndsWith, result : "endswith(SupplierName,'SAP')"},
		{op : FilterOperator.StartsWith, result : "startswith(SupplierName,'SAP')"}
	].forEach(function (oFixture) {
		QUnit.test("requestFilter: " + oFixture.op + " --> " + oFixture.result, function (assert) {
			var oBinding = {
					sPath : "/SalesOrderList('4711')/SO_2_ITEMS",
					oModel : {
						oMetaModel : {
							getMetaContext : function () {},
							requestObject : function () {}
						}
					}
				},
				oContext = {},
				oFilter = new Filter("SupplierName", oFixture.op, "SAP", "XYZ"),
				oMetaModelMock = this.mock(oBinding.oModel.oMetaModel),
				oHelperMock = this.mock(_Helper),
				oPropertyMetadata = {$Type : "Edm.String"};

			oMetaModelMock.expects("getMetaContext")
				.withExactArgs("/SalesOrderList('4711')/SO_2_ITEMS/SupplierName")
				.returns(oContext);
			oMetaModelMock.expects("requestObject")
				.withExactArgs(undefined, oContext)
				.returns(Promise.resolve(oPropertyMetadata));
			oHelperMock.expects("formatLiteral").withExactArgs("SAP", "Edm.String")
				.returns("'SAP'");
			if (oFixture.op === FilterOperator.BT) {
				oHelperMock.expects("formatLiteral").withExactArgs("XYZ", "Edm.String")
					.returns("'XYZ'");
			}

			return _ODataHelper.requestFilter(oBinding, [oFilter], [], undefined)
				.then(function (sFilterValue) {
					assert.strictEqual(sFilterValue, oFixture.result);
				});
		});
	});

	//*********************************************************************************************
	QUnit.test("requestFilter: dynamic and static filters", function (assert) {
		var oBinding = {
				sPath : "/SalesOrderList",
				oModel : {
					oMetaModel : {
						getMetaContext : function (sPath) {
							return { path : sPath }; // path === metapath
						},
						requestObject : function () {}
					}
				}
			},
			oFilter0 = new Filter("BuyerName", FilterOperator.EQ, "SAP"),
			oFilter1 = new Filter("GrossAmount", FilterOperator.LE, 12345),
			oHelperMock = this.mock(_Helper),
			oMetaModelMock = this.mock(oBinding.oModel.oMetaModel),
			oPropertyMetadata0 = {$Type : "Edm.String"},
			oPropertyMetadata1 = {$Type : "Edm.Decimal"};

		oMetaModelMock.expects("requestObject")
			.withExactArgs(undefined, {path : "/SalesOrderList/BuyerName"})
			.returns(Promise.resolve(oPropertyMetadata0));
		oMetaModelMock.expects("requestObject")
			.withExactArgs(undefined, {path : "/SalesOrderList/GrossAmount"})
			.returns(Promise.resolve(oPropertyMetadata1));
		oHelperMock.expects("formatLiteral").withExactArgs("SAP", "Edm.String").returns("'SAP'");
		oHelperMock.expects("formatLiteral").withExactArgs(12345, "Edm.Decimal").returns(12345);

		return _ODataHelper.requestFilter(oBinding, [oFilter0, oFilter1], [], "GrossAmount ge 1000")
			.then(function (sFilterValue) {
				assert.strictEqual(sFilterValue,
					"(BuyerName eq 'SAP' and GrossAmount le 12345) and (GrossAmount ge 1000)");
			});
	});

	//*********************************************************************************************
	QUnit.test("requestFilter: static filter only", function (assert) {
		var oBinding = {
				sPath : "/SalesOrderList"
			};

		return _ODataHelper.requestFilter(oBinding, [], [], "GrossAmount ge 1000")
			.then(function (sFilterValue) {
				assert.strictEqual(sFilterValue, "GrossAmount ge 1000");
			});
	});

	//*********************************************************************************************
	QUnit.test("requestFilter: error invalid operator", function (assert) {
		var oBinding = {
				sPath : "/SalesOrderList",
				oModel : {
					oMetaModel : {
						getMetaContext : function (sPath) {
							return { path : sPath }; // path === metapath
						},
						requestObject : function () {}
					}
				}
			},
			oFilter = new Filter("BuyerName", "invalid", "SAP"),
			oPropertyMetadata = {$Type : "Edm.String"};

		this.mock(oBinding.oModel.oMetaModel).expects("requestObject")
			.withExactArgs(undefined, {path : "/SalesOrderList/BuyerName"})
			.returns(Promise.resolve(oPropertyMetadata));
		this.mock(_Helper).expects("formatLiteral").withExactArgs("SAP", "Edm.String")
			.returns("'SAP'");

		return _ODataHelper.requestFilter(oBinding, [oFilter], [], undefined)
			.then(function () {
				assert.ok(false);
			}, function (oError) {
				assert.strictEqual(oError.message, "Unsupported operator: invalid");
			}
		);
	});

	//*********************************************************************************************
	QUnit.test("requestFilter: error no metadata for filter path", function (assert) {
		var sPath = "/SalesOrderList/BuyerName",
			oMetaContext = {
				getPath : function () { return sPath; }
			},
			oBinding = {
				sPath : "/SalesOrderList",
				oModel : {
					oMetaModel : {
						getMetaContext : function () { return oMetaContext; },
						requestObject : function () {}
					}
				}
			},
			oFilter = new Filter("BuyerName", FilterOperator.EQ, "SAP");

		this.mock(oBinding.oModel.oMetaModel).expects("requestObject")
			.withExactArgs(undefined, oMetaContext)
			.returns(Promise.resolve(undefined));

		return _ODataHelper.requestFilter(oBinding, [oFilter], [], undefined)
			.then(function () {
				assert.ok(false);
			}, function (oError) {
				assert.strictEqual(oError.message,
					"Type cannot be determined, no metadata for path: /SalesOrderList/BuyerName");
			}
		);
	});

	//*********************************************************************************************
	[
		{ filters : [], result : "" },
		{ filters : ["path0", "path1"], result : "path0 eq path0Value and path1 eq path1Value" },
		{ // "grouping": or conjunction for filters with same path
			filters : [{ p : "path0", v : "foo" }, "path1", { p : "path0", v : "bar" }],
			result : "(path0 eq foo or path0 eq bar) and path1 eq path1Value"
		}
	].forEach(function (oFixture) {
		QUnit.test("requestFilter: flat filter '" + oFixture.result + "'", function (assert) {
			var oBinding = {
					sPath : "/SalesOrderList",
					oModel : {
						oMetaModel : {
							getMetaContext : function (sPath) {
								return { path : sPath }; // path === metapath
							},
							requestObject : function () {}
						}
					}
				},
				aFilters = [],
				oHelperMock = this.mock(_Helper),
				oMetaModelMock = this.mock(oBinding.oModel.oMetaModel),
				mRequestObjectByPath = {},
				oPropertyMetadata = {$Type : "Edm.Type"};

			oFixture.filters.forEach(function (vFilter) {
				var sPath,
					sValue;

				if (typeof vFilter === "string") { // single filter: path only
					sPath = vFilter; sValue = sPath + "Value";
				} else { // single filter: path and value
					sPath = vFilter.p; sValue = vFilter.v;
				}

				aFilters.push(new Filter(sPath, FilterOperator.EQ, sValue));
				if (!mRequestObjectByPath[sPath]) { // Edm type request happens only once per path
					mRequestObjectByPath[sPath] = true;
					oMetaModelMock.expects("requestObject")
						.withExactArgs(undefined, {path : "/SalesOrderList/" + sPath})
						.returns(Promise.resolve(oPropertyMetadata));
				}
				oHelperMock.expects("formatLiteral").withExactArgs(sValue, "Edm.Type")
					.returns(sValue);
			});

			return _ODataHelper.requestFilter(oBinding, aFilters, [], undefined)
				.then(function (sFilterValue) {
					assert.strictEqual(sFilterValue, oFixture.result);
				});
		});
	});

	QUnit.test("requestFilter: hierarchical filter", function (assert) {
		var oBinding = {
				sPath : "/Set",
				oModel : {
					oMetaModel : {
						getMetaContext : function (sPath) {
							return { path : sPath }; // path === metapath
						},
						requestObject : function () {}
					}
				}
			},
			aFilters = [
				new Filter("p0.0", FilterOperator.EQ, "v0.0"),
				new Filter({
					filters : [
						new Filter("p1.0", FilterOperator.EQ, "v1.0"),
						new Filter("p1.1", FilterOperator.EQ, "v1.1")
					]
				}),
				new Filter({
					filters : [
						new Filter("p2.0", FilterOperator.EQ, "v2.0"),
						new Filter("p2.1", FilterOperator.EQ, "v2.1"),
						new Filter("p2.2", FilterOperator.EQ, "v2.2")
					],
					and : true
				}),
				new Filter("p3.0", FilterOperator.EQ, "v3.0")
			],
			oMetaModelMock = this.mock(oBinding.oModel.oMetaModel),
			oPropertyMetadata = {$Type : "Edm.String"},
			oPromise = Promise.resolve(oPropertyMetadata);

		oMetaModelMock.expects("requestObject").withExactArgs(undefined, {path : "/Set/p0.0"})
			.returns(oPromise);
		oMetaModelMock.expects("requestObject").withExactArgs(undefined, {path : "/Set/p1.0"})
			.returns(oPromise);
		oMetaModelMock.expects("requestObject").withExactArgs(undefined, {path : "/Set/p1.1"})
			.returns(oPromise);
		oMetaModelMock.expects("requestObject").withExactArgs(undefined, {path : "/Set/p2.0"})
			.returns(oPromise);
		oMetaModelMock.expects("requestObject").withExactArgs(undefined, {path : "/Set/p2.1"})
			.returns(oPromise);
		oMetaModelMock.expects("requestObject").withExactArgs(undefined, {path : "/Set/p2.2"})
			.returns(oPromise);
		oMetaModelMock.expects("requestObject").withExactArgs(undefined, {path : "/Set/p3.0"})
		.returns(oPromise);

		return _ODataHelper.requestFilter(oBinding, aFilters, [], undefined)
			.then(function (sFilterValue) {
				assert.strictEqual(sFilterValue,
					"p0.0 eq 'v0.0'"
					+ " and (p1.0 eq 'v1.0' or p1.1 eq 'v1.1')"
					+ " and (p2.0 eq 'v2.0' and p2.1 eq 'v2.1' and p2.2 eq 'v2.2')"
					+ " and p3.0 eq 'v3.0'"
				);
			});
	});

	QUnit.test("requestFilter: application and control filter", function (assert) {
		var aAppFilters = [new Filter("p0.0", FilterOperator.EQ, "v0.0")],
			oBinding = {
				sPath : "/Set",
				oModel : {
					oMetaModel : {
						getMetaContext : function (sPath) {
							return { path : sPath }; // path === metapath
						},
						requestObject : function () {}
					}
				}
			},
			aControlFilters = [new Filter("p1.0", FilterOperator.EQ, "v1.0")],
			oMetaModelMock = this.mock(oBinding.oModel.oMetaModel),
			oPropertyMetadata = {$Type : "Edm.String"},
			oPromise = Promise.resolve(oPropertyMetadata);

		oMetaModelMock.expects("requestObject").withExactArgs(undefined, {path : "/Set/p0.0"})
			.returns(oPromise);
		oMetaModelMock.expects("requestObject").withExactArgs(undefined, {path : "/Set/p1.0"})
			.returns(oPromise);

		return _ODataHelper.requestFilter(oBinding, aAppFilters, aControlFilters, "p2.0 eq 'v2.0'")
			.then(function (sFilterValue) {
				assert.strictEqual(sFilterValue,
					"(p0.0 eq 'v0.0') and (p1.0 eq 'v1.0') and (p2.0 eq 'v2.0')");
			});
	});

	QUnit.test("requestFilter: filter with encoded path", function (assert) {
		var aAppFilters = [new Filter("AmountIn%E2%82%AC", FilterOperator.GT, "10000")],
			oBinding = {
				sPath : "/Set",
				oModel : {
					oMetaModel : {
						getMetaContext : function (sPath) {
							// decoded path === metapath
							return { path : decodeURIComponent(sPath) };
						},
						requestObject : function () {}
					}
				}
			},
			oMetaModelMock = this.mock(oBinding.oModel.oMetaModel),
			oPropertyMetadata = {$Type : "Edm.Decimal"},
			oPromise = Promise.resolve(oPropertyMetadata);

		oMetaModelMock.expects("requestObject").withExactArgs(undefined, {path : "/Set/AmountIn€"})
			.returns(oPromise);

		return _ODataHelper.requestFilter(oBinding, aAppFilters, [], undefined)
			.then(function (sFilterValue) {
				assert.strictEqual(sFilterValue, "AmountIn€ gt 10000");
			});
	});

	[
		{mQueryOptions : undefined, sPath : "foo", sQueryPath : "delegate/to/context"},
		{mQueryOptions : undefined, sPath : "foo", sQueryPath : undefined}
	].forEach(function (oFixture, i) {
		QUnit.test("getQueryOptions - delegating - " + i, function (assert) {
			var oBinding = {
					mQueryOptions : oFixture.mQueryOptions,
					sPath : oFixture.sPath
				},
				oContext = {
					getQueryOptions : function () {}
				},
				mResultingQueryOptions = {},
				sResultPath = "any/path";

			this.mock(_Helper).expects("buildPath")
				.withExactArgs(oBinding.sPath, oFixture.sQueryPath).returns(sResultPath);
			this.mock(oContext).expects("getQueryOptions")
				.withExactArgs(sResultPath)
				.returns(mResultingQueryOptions);

			// code under test
			assert.strictEqual(
				_ODataHelper.getQueryOptions(oBinding, oFixture.sQueryPath, oContext),
				mResultingQueryOptions, "sQueryPath:" + oFixture.sQueryPath);

			// code under test
			assert.strictEqual(
				_ODataHelper.getQueryOptions(oBinding, oFixture.sQueryPath, undefined),
				undefined, "no query options and no context");
		});
	});

	//*********************************************************************************************
	QUnit.test("getQueryOptions - query options and no path", function (assert) {
		var oBinding = {
				mQueryOptions : {}
			},
			oContext = {
				getQueryOptions : function () {}
			};

		this.mock(_Helper).expects("buildPath").never();
		this.mock(oContext).expects("getQueryOptions").never();

		// code under test
		assert.strictEqual(_ODataHelper.getQueryOptions(oBinding), oBinding.mQueryOptions,
			oContext);
		assert.strictEqual(_ODataHelper.getQueryOptions(oBinding, ""), oBinding.mQueryOptions,
			oContext);
	});

	//*********************************************************************************************
	QUnit.test("getQueryOptions - find in query options", function (assert) {
		var mEmployee2EquipmentOptions = {
				$orderby : "EquipmentId"
			},
			mTeam2EmployeeOptions = {
				"$expand" : {
					"Employee_2_Equipment" : mEmployee2EquipmentOptions
				},
				$orderby : "EmployeeId"
			},
			mParameters = {
				"$expand" : {
					"Team_2_Employees" : mTeam2EmployeeOptions,
					"Team_2_Manager" : null,
					"Team_2_Equipments" : true
				},
				"$orderby" : "TeamId",
				"sap-client" : "111"
			},
			oBinding = {
				oModel : {
					mUriParameters : {"sap-client" : "111"}
				},
				mQueryOptions : mParameters,
				sPath : "any/path"
			},
			oContext = {
				getQueryOptions : function () {}
			},
			oODataHelperMock = this.mock(_ODataHelper),
			mResultingQueryOptions = {}; // content not relevant

		this.mock(_Helper).expects("buildPath").never();
		this.mock(oContext).expects("getQueryOptions").never();

		[
			{sQueryPath : "foo", mResult : undefined},
			{sQueryPath : "Team_2_Employees", mResult : mTeam2EmployeeOptions},
			{
				sQueryPath : "Team_2_Employees/Employee_2_Equipment",
				mResult : mEmployee2EquipmentOptions
			},
			{sQueryPath : "Team_2_Employees/Employee_2_Equipment/foo", mResult : undefined},
			{sQueryPath : "Team_2_Employees/foo/Employee_2_Equipment", mResult : undefined},
			{sQueryPath : "Team_2_Manager", mResult : undefined},
			{sQueryPath : "Team_2_Equipments", mResult : undefined},
			{
				sQueryPath : "Team_2_Employees(2)/Employee_2_Equipment('42')",
				mResult : mEmployee2EquipmentOptions
			},
			{
				sQueryPath : "15/Team_2_Employees/2/Employee_2_Equipment/42",
				mResult : mEmployee2EquipmentOptions
			}
		].forEach(function (oFixture, i) {
			oODataHelperMock.expects("buildQueryOptions")
				.withExactArgs(sinon.match.same(oBinding.oModel.mUriParameters),
					oFixture.mResult ? sinon.match.same(oFixture.mResult) : undefined,
					sinon.match.same(_ODataHelper.aAllowedSystemQueryOptions))
				.returns(mResultingQueryOptions);
			// code under test
			assert.strictEqual(_ODataHelper.getQueryOptions(oBinding, oFixture.sQueryPath),
				mResultingQueryOptions, "sQueryPath:" + oFixture.sQueryPath);
		});
	});
	// TODO handle encoding in getQueryOptions
	//TODO dynamic app filters in ODLB constructor/ODataModel#bindList
});
