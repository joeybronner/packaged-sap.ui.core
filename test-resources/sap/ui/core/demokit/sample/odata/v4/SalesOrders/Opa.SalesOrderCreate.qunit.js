/*!
 * ${copyright}
 */
sap.ui.require([
	"jquery.sap.global",
	"sap/ui/test/Opa5",
	"sap/ui/test/opaQunit",
	"sap/ui/test/actions/Press",
	"sap/ui/test/matchers/BindingPath",
	"sap/ui/test/matchers/Interactable",
	"sap/ui/test/matchers/Properties",
	"sap/ui/Device"
], function (jQuery, Opa5, opaTest, Press, BindingPath, Interactable, Properties, Device) {
	/*global QUnit */
	"use strict";

	QUnit.module("sap.ui.core.sample.odata.v4.SalesOrders - Create");

	//*****************************************************************************
	opaTest("Create, modify and delete - all transient", function (Given, When, Then) {
		var vRealOData = jQuery.sap.getUriParameters().get("realOData"),
			bRealOData = /direct|proxy|true/.test(vRealOData),
			sModifiedNote = "Modified by OPA";

		Given.iStartMyAppInAFrame("../../../common/index.html?component=odata.v4.SalesOrders"
				+ "&sap-language=en"
				+ (bRealOData ? "&sap-server=test" : "")
				+ "&realOData=" + encodeURIComponent(vRealOData)
				// TestUtils.js does not support deletion via $batch
				+ (bRealOData ? "" : "&$direct=true"));

		// Create, modify and delete of an unsaved sales order
		When.onTheMainPage.firstSalesOrderIsVisible();
		When.onTheMainPage.pressCreateSalesOrdersButton();
		Then.onTheCreateNewSalesOrderDialog.checkNewBuyerId("0100000000");
		Then.onTheCreateNewSalesOrderDialog.checkNewNote();
		Then.onTheMainPage.checkNote(0);
		When.onTheCreateNewSalesOrderDialog.changeNote(sModifiedNote);
		Then.onTheCreateNewSalesOrderDialog.checkNewNote(sModifiedNote);
		Then.onTheMainPage.checkNote(0, sModifiedNote);
		When.onTheCreateNewSalesOrderDialog.confirmDialog();
		Then.onTheMainPage.checkID(0, "");
		When.onTheMainPage.selectSalesOrderWithId("");
		When.onTheMainPage.changeNote(0, sModifiedNote + "_2");
		Then.onTheMainPage.checkNote(0, sModifiedNote + "_2");
		When.onTheMainPage.deleteSelectedSalesOrder();
		When.onTheSalesOrderDeletionConfirmation.cancel();
		Then.onTheMainPage.checkID(0, "");
		When.onTheMainPage.deleteSelectedSalesOrder();
		When.onTheSalesOrderDeletionConfirmation.confirm();
		When.onTheSuccessInfo.confirm();
		Then.onTheMainPage.checkID(0);

		// Create a sales order, save, modify again, save and delete
		When.onTheMainPage.pressCreateSalesOrdersButton();
		When.onTheCreateNewSalesOrderDialog.changeNote(sModifiedNote + "_save");
		When.onTheCreateNewSalesOrderDialog.confirmDialog();
		Then.onTheMainPage.checkID(0, "");
		Then.onTheMainPage.checkButtonDisabled("confirmSalesOrder");
		When.onTheMainPage.pressSaveSalesOrdersButton();
		When.onTheSuccessInfo.confirm();
		if (bRealOData) {
			Then.onTheMainPage.checkButtonEnabled("confirmSalesOrder");
			// TODO: TestUtils may support to provide JSON response/or generated keys...
			Then.onTheMainPage.checkDifferentID(0, "");
			// TODO: TestUtils does not support PATCH at all
			When.onTheMainPage.changeNote(0, sModifiedNote + "_3");
			When.onTheMainPage.pressSaveSalesOrdersButton();
		}
		When.onTheMainPage.deleteSelectedSalesOrder();
		When.onTheSalesOrderDeletionConfirmation.confirm();
		When.onTheSuccessInfo.confirm();
		Then.onTheMainPage.checkID(0);

		// Create a sales order, save and refresh the sales orders
		When.onTheMainPage.pressCreateSalesOrdersButton();
		When.onTheCreateNewSalesOrderDialog.changeNote(sModifiedNote + "_save");
		When.onTheCreateNewSalesOrderDialog.confirmDialog();
		Then.onTheMainPage.checkID(0, "");
		When.onTheMainPage.pressSaveSalesOrdersButton();
		When.onTheSuccessInfo.confirm();
		When.onTheMainPage.rememberCreatedSalesOrder();
		When.onTheMainPage.pressRefreshSalesOrdersButton();
		Then.onTheMainPage.checkID(0);

		When.onTheMainPage.doubleRefresh();
		Then.onTheMainPage.checkID(0);

		// Create a sales order, refresh/filter w/o saving -> expected "pending changes" message
		When.onTheMainPage.pressCreateSalesOrdersButton();
		When.onTheCreateNewSalesOrderDialog.confirmDialog();
		// Cancel refresh
		When.onTheMainPage.pressRefreshSalesOrdersButton();
		When.onTheRefreshConfirmation.cancel();
		Then.onTheMainPage.checkID(0, "");
		When.onTheMainPage.pressRefreshAllButton();
		When.onTheRefreshConfirmation.cancel();
		Then.onTheMainPage.checkID(0, "");
		if (bRealOData) {
			When.onTheMainPage.filterGrossAmount("1000");
			When.onTheErrorInfo.confirm();
			Then.onTheMainPage.checkID(0, "");
		}
		// Confirm refresh
		When.onTheMainPage.pressRefreshSalesOrdersButton();
		When.onTheRefreshConfirmation.confirm();
		When.onTheMainPage.firstSalesOrderIsAtPos0();
		Then.onTheMainPage.checkID(0);

		// Create a sales order, press "cancel sales order changes" w/o saving
		When.onTheMainPage.pressCreateSalesOrdersButton();
		When.onTheCreateNewSalesOrderDialog.confirmDialog();
		When.onTheMainPage.pressCancelSalesOrdersChangesButton();
		When.onTheMainPage.firstSalesOrderIsAtPos0();
		Then.onTheMainPage.checkID(0);

		if (bRealOData) {
			// Cancel/resume failed creation of a sales order
			// Create a sales order with invalid note, save, cancel
			When.onTheMainPage.pressCreateSalesOrdersButton();
			When.onTheCreateNewSalesOrderDialog.confirmDialog();
			When.onTheMainPage.pressSaveSalesOrdersButton();
			When.onTheMainPage.pressRefreshSalesOrdersButton();
			When.onTheRefreshConfirmation.cancel();
			Then.onTheMainPage.checkID(0, "");
			When.onTheMainPage.pressCancelSalesOrdersChangesButton();
			When.onTheMainPage.firstSalesOrderIsAtPos0();
			// Create a sales order with invalid note, save, update note, save -> success
			When.onTheMainPage.pressCreateSalesOrdersButton();
			When.onTheCreateNewSalesOrderDialog.confirmDialog();
			When.onTheMainPage.pressSaveSalesOrdersButton();
			// do it again, POST is sent again without a change
			// TODO implement error handling and check the errors on save
			When.onTheMainPage.pressSaveSalesOrdersButton();
			When.onTheMainPage.changeNote(0, "Valid Note");
			When.onTheMainPage.pressSaveSalesOrdersButton();
			When.onTheSuccessInfo.confirm();
			Then.onTheMainPage.checkDifferentID(0, "");
			// cleanup
			When.onTheMainPage.deleteSelectedSalesOrder();
			When.onTheSalesOrderDeletionConfirmation.confirm();
			When.onTheSuccessInfo.confirm();
			Then.onTheMainPage.checkID(0);
		}

		// set base context for input field FavoriteProductID
		When.onTheMainPage.pressSetBindingContextButton();
		Then.onTheMainPage.checkFavoriteProductID();

		if (bRealOData) {
			// Filter and then sort: filter is not lost on sort
			When.onTheMainPage.filterGrossAmount("1000");
			Then.onTheMainPage.checkFirstGrossAmountGreater("1000");
			When.onTheMainPage.sortByGrossAmount();
			Then.onTheMainPage.checkFirstGrossAmountGreater("1000");
		}

		// delete the last created SalesOrder again
		Then.onTheMainPage.cleanUp();
		Then.onTheMainPage.checkLog();
		Then.iTeardownMyAppFrame();
	});
});
