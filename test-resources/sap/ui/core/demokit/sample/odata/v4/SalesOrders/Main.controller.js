/*!
 * ${copyright}
 */
sap.ui.define([
		'sap/m/Dialog',
		'sap/m/MessageBox',
		'sap/m/MessageToast',
		'sap/ui/core/format/DateFormat',
		'sap/ui/core/Item',
		'sap/ui/core/mvc/Controller',
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		'sap/ui/model/json/JSONModel'
], function (Dialog, MessageBox, MessageToast, DateFormat, Item, Controller, Filter, FilterOperator,
		JSONModel) {
	"use strict";

	var oDateFormat = DateFormat.getTimeInstance({pattern : "HH:mm"}),
		sServiceNamespace = "com.sap.gateway.default.iwbep.v4_gw_sample_basic.v0001.";

//	function onRejected(oError) {
//		jQuery.sap.log.error(oError.message, oError.stack);
//		MessageBox.alert(oError.message, {
//			icon : MessageBox.Icon.ERROR,
//			title : "Error"});
//	}

	return Controller.extend("sap.ui.core.sample.odata.v4.SalesOrders.Main", {
		_setSalesOrderBindingContext : function (oSalesOrderContext) {
			var oView = this.getView();

			oView.byId("ObjectPage").setBindingContext(oSalesOrderContext);
			oView.byId("SupplierContactData").setBindingContext(undefined);
			oView.byId("SupplierDetailsForm").setBindingContext(undefined);
			if (!oSalesOrderContext) {
				oView.byId("SalesOrders").removeSelections();
			}
		},

		onCancelSalesOrder : function (oEvent) {
			this.getView().getModel().resetChanges("SalesOrderUpdateGroup");
		},

		onCancelSalesOrderCreate : function (oEvent) {
			var oCreateSalesOrderDialog = this.getView().byId("createSalesOrderDialog");

			oCreateSalesOrderDialog.close();
		},

		onCancelSalesOrderSchedules : function (oEvent) {
			this.getView().byId("SalesOrderSchedulesDialog").close();
		},

		onCancelSalesOrderList : function (oEvent) {
			this.getView().getModel().resetChanges("SalesOrderListUpdateGroup");
		},

		onConfirmSalesOrder : function () {
			var oModel = this.getView().getModel(),
				oTable = this.getView().byId("SalesOrders"),
				oSalesOrderContext = oTable.getSelectedItem().getBindingContext(),
				oAction = oModel.bindContext(sServiceNamespace + "SalesOrder_Confirm(...)",
					oSalesOrderContext),
				that = this;

			oAction.execute().then(
				function () {
					MessageToast.show("Sales order "
						+ oSalesOrderContext.getProperty("SalesOrderID") + " confirmed");
					that.refresh(that.getView().byId("SalesOrders").getBinding("items"),
						"all sales orders");
				},
				function (oError) {
					MessageBox.alert(oError.message, {
						icon : MessageBox.Icon.ERROR,
						title : "Error"});
				}
			);
		},

		onCreateSalesOrderDialog : function (oEvent) {
			var oView = this.getView(),
				oBuyerIdInput = oView.byId("BuyerID"),
				oCreateSalesOrderDialog = oView.byId("createSalesOrderDialog");

			oCreateSalesOrderDialog.setModel(new JSONModel({}), "new");
			if (!oBuyerIdInput.getBinding("suggestionItems")) {
				oBuyerIdInput.bindAggregation("suggestionItems", {
					path : '/BusinessPartnerList',
					parameters : {'$$groupId' : '$direct'},
					template : new Item({text : "{BusinessPartnerID}"})
				});
			}
			oCreateSalesOrderDialog.open();
		},

		onCreateSalesOrder : function (oEvent) {
//			var oCreateSalesOrderDialog = this.getView().byId("createSalesOrderDialog"),
//				oSalesOrderData = oCreateSalesOrderDialog.getModel("new").getObject("/"),
//				that = this;

			//TODO validate oSalesOrderData according to types
			//TODO deep create incl. LOCATION etc.
//				TODO the code will be needed when "create" is implemented
//				MessageBox.alert(JSON.stringify(oData),
//					{icon : MessageBox.Icon.SUCCESS, title : "Success"});
//				that.onCancelSalesOrder();
		},

		onDataEvents : function (oEvent) {
			var aSalesOrderIDs = [],
				oSource = oEvent.getSource();

			jQuery.sap.log.info(oEvent.getId() + " event processed for path " + oSource.getPath(),
				oSource, "sap.ui.core.sample.odata.v4.SalesOrders.Main.controller");

			if (oEvent.getId() === "dataReceived") {
				if (oSource.getPath() === "/SalesOrderList") {
					oSource.getCurrentContexts().forEach(function (oContext) {
						aSalesOrderIDs.push(oContext.getProperty("SalesOrderID"));
					});
					jQuery.sap.log.info("Current SalesOrderIDs: " + aSalesOrderIDs.join(", "),
						null, "sap.ui.core.sample.odata.v4.SalesOrders.Main.controller");
				} else if (oSource.getPath() === "/ProductList('HT-1000')/Name") {
					jQuery.sap.log.info("Favorite Product ID: " + oSource.getValue(),
						null, "sap.ui.core.sample.odata.v4.SalesOrders.Main.controller");
				} else if (/^\/SalesOrderList\(.*\)/.test(oSource.getPath())) {
					jQuery.sap.log.info("Current Sales Order: "
						+ oSource.getBoundContext().getProperty("SalesOrderID"),
						null, "sap.ui.core.sample.odata.v4.SalesOrders.Main.controller");
				}
			}
		},

		onDeleteSalesOrder : function (oEvent) {
			var oSalesOrderContext = oEvent.getSource().getBindingContext(),
				// oModel = oSalesOrderContext.getModel(),
				sMessage,
				sOrderID;
				// oView = this.getView();

			function onConfirm(sCode) {
				if (sCode !== 'OK') {
					return;
				}
				MessageBox.alert("Not yet implemented");
//					TODO the code will be needed when "remove" is implemented
//					MessageBox.alert("Deleted Sales Order: " + sOrderID,
//						{icon : MessageBox.Icon.SUCCESS, title : "Success"});
//					oView.byId("SalesOrderLineItems").setBindingContext(undefined);
//					oView.byId("SupplierContactData").setBindingContext(undefined);
			}
			sOrderID = oSalesOrderContext.getProperty("SalesOrderID", true);
			sMessage = "Do you really want to delete: " + sOrderID
				+ ", Gross Amount: " + oSalesOrderContext.getProperty("GrossAmount", true)
				+ " " + oSalesOrderContext.getProperty("CurrencyCode", true) + "?";
			MessageBox.confirm(sMessage, onConfirm, "Sales Order Deletion");
		},

		onFilter : function (oEvent) {
			var oView = this.getView(),
				oBinding = oView.byId("SalesOrders").getBinding("items"),
				sQuery = oView.getModel("ui").getProperty("/filterValue"); // TODO validation

			if (oBinding.hasPendingChanges()) {
				MessageBox.error("Cannot filter due to unsaved changes"
					+ "; save or reset changes before filtering");
				return;
			}
			oBinding.filter(sQuery
				? new Filter("GrossAmount", FilterOperator.GT, sQuery)
				: null);
			this._setSalesOrderBindingContext();
		},

		onFilterItems : function (oEvent) {
			var oView = this.getView(),
				oBinding = oView.byId("SalesOrderLineItems").getBinding("items"),
				sQuery = oView.getModel("ui").getProperty("/filterProductID");

			if (oBinding.hasPendingChanges()) {
				MessageBox.error("Cannot filter due to unsaved changes"
					+ "; save or reset changes before filtering");
				return;
			}
			oBinding.filter(sQuery
				? new Filter("Product/ProductID", FilterOperator.EQ, sQuery)
				: null);
		},

		onInit : function () {
			var bMessageOpen = false,
				oMessageManager = sap.ui.getCore().getMessageManager(),
				oMessageModel = oMessageManager.getMessageModel();

			this.oMessageModelBinding = oMessageModel.bindList("/", undefined,
				[], new Filter("technical", FilterOperator.EQ, true));

			this.oMessageModelBinding.attachChange(function (oEvent) {
				var aContexts = oEvent.getSource().getContexts(),
					aMessages = [],
					sPrefix;

				if (bMessageOpen || !aContexts.length) {
					return;
				}

				// Extract and remove the technical messages
				aContexts.forEach(function (oContext) {
					aMessages.push(oContext.getObject());
				});
				oMessageManager.removeMessages(aMessages);

				// Due to batching there can be more than one technical message. However the UX
				// guidelines say "display a single message in a message box" assuming that there
				// will be only one at a time.
				sPrefix = aMessages.length === 1 ? ""
					: "There have been multiple technical errors. One example: ";
				MessageBox.error(sPrefix + aMessages[0].message, {
					id : "serviceErrorMessageBox",
					onClose: function () {
						bMessageOpen = false;
					}
				});
				bMessageOpen = true;
			});
		},

		onRefreshAll : function () {
			var oModel = this.getView().getModel();

			this.refresh(oModel, "everything",
				["SalesOrderListUpdateGroup", "SalesOrderUpdateGroup"]);
		},

		onRefreshFavoriteProduct : function (oEvent) {
			this.refresh(this.getView().byId("FavoriteProduct").getBinding("value"),
				"the favorite product");
		},

//		onRefreshSalesOrderDetails : function (oEvent) {
//			this.refresh(this.getView().byId("ObjectPage").getElementBinding(),
//				"the sales order");
//		},

		onRefreshSalesOrdersList : function (oEvent) {
			this.refresh(this.getView().byId("SalesOrders").getBinding("items"),
				"all sales orders");
		},

		onSalesOrderSchedules : function (oEvent) {
			this.getView().byId("SalesOrderSchedulesDialog").open();
		},

		onSalesOrdersSelect : function (oEvent) {
			var oUIModel = this.getView().getModel("ui");
			this._setSalesOrderBindingContext(oEvent.getParameters().listItem.getBindingContext());
			oUIModel.setProperty("/bSalesOrderSelected", true);
			oUIModel.setProperty("/bLineItemSelected", false);

		},

		onSalesOrderLineItemSelect : function (oEvent) {
			var oView = this.getView(),
				oSalesOrderLineItemContext = oEvent.getParameters().listItem.getBindingContext();

			oView.byId("SupplierContactData").setBindingContext(oSalesOrderLineItemContext);
			oView.byId("SupplierDetailsForm").setBindingContext(oSalesOrderLineItemContext);
			oView.getModel("ui").setProperty("/bLineItemSelected", true);
		},

		onSaveSalesOrder : function () {
			this.getView().getModel().submitBatch("SalesOrderUpdateGroup");
		},

		onSaveSalesOrderSchedules : function () {
			var oView = this.getView();

			oView.getModel().submitBatch("SalesOrderUpdateGroup");
			oView.byId("SalesOrderSchedulesDialog").close();
		},

		onSaveSalesOrderList : function () {
			this.getView().getModel().submitBatch("SalesOrderListUpdateGroup");
		},

		/**
		 * Update the favorite product's name by replacing it with the current time (hour/minute).
		 * This shows a somehow useful update, you should be able to see changes on the UI quite
		 * frequently, but not too many backend requests.
		 */
		onUpdateFavoriteProduct : function (/*oEvent*/) {
			var oBinding = this.getView().byId("FavoriteProduct").getBinding("value");

			oBinding.setValue(oDateFormat.format(new Date()));
		},

		produceTechnicalError : function () {
			var oViewElement = this.getView().byId("FavoriteProduct");

			oViewElement.bindProperty("value", {path : "/ProductList('HT-1000')/Unknown"});
		},

		/**
		 * Refreshes (parts of) the UI. Offers to reset changes via two-way binding before, because
		 * otherwise the refresh would fail.
		 *
		 * @param {object} oRefreshable
		 *   The object to be refreshed, either the model or a binding
		 * @param {string} sRefreshableText
		 *   The text used for the refreshable in the confirmation dialog if there are pending
		 *   changes
		 * @param {string[]} [aUpdateGroupIds]
		 *   A list of IDs of batch groups to reset. If not given, the refreshable's default group
		 *   is reset.
		 */
		refresh : function (oRefreshable, sRefreshableText, aUpdateGroupIds) {
			if (oRefreshable.hasPendingChanges()) {
				MessageBox.confirm(
					"There are pending changes. Do you really want to refresh " + sRefreshableText
						+ "?",
					function onConfirm(sCode) {
						if (sCode === "OK") {
							if (aUpdateGroupIds) {
								aUpdateGroupIds.forEach(function (sUpdateGroupId) {
									oRefreshable.resetChanges(sUpdateGroupId);
								});
							} else {
								oRefreshable.resetChanges();
							}
							oRefreshable.refresh();
						}
					},
					"Refresh");
			} else {
				oRefreshable.refresh();
			}
		}
	});

});