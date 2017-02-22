﻿(function () {
    'use strict';
    var module = angular.module("caWebApp");

    var controller = function ($scope, $location, messageService, inventoryService) {
        var model = this;
        model.editing = false;
        model.product = {};
        model.provider = {};
        model.title = "Admin Product Management";

        model.unitsOfMeasure = [];
        model.productTypes = [];
        model.categories = [];
        model.contracts = [];
        model.contractors = [];
        model.products = [];
        model.orderByColumn = "name";
        model.orderAscending = true;
        model.page = 0;
        model.itemsPerPage = 10;
        model.pageCount = 1;
        model.filter = {};
        model.activeFilter = {};
        model.tab = 3;
        model.importProgress = "";
        model.imageFileNames = [];

        //sample query model
        //for strings, "A|B" converts to "column like '%A%' or column like '%B%'
        //for currency, "A|B" converts to "A <= column and column <= B"
        //{
        //    "Start": 0,
        //    "Count": 10,
        //    "OrderByColumn": "Title",
        //    "OrderAscending": true,
        //    "Fuzzy": false,
        //    "Filter": { "Category":"Service|Computer", "ListPrice":"31|34"}
        //}

        model.setOrderByColumn = function (columnName) {
            if (model.orderByColumn == columnName)
            {
                model.orderAscending = !model.orderAscending;
            }
            else
            {
                model.orderByColumn = columnName;
                model.page = 0;
            }
            model.fetchProducts();
        };

        model.filterProducts = function () {
            model.activeFilter = model.filter;
            model.page = 0;
            model.tab = 3;
            model.fetchAll();
        };

        model.clearFilter = function () {
            model.filter = {};
            model.activeFilter = {};
        };

        model.showFilter = function () {
            model.tab = 4;
            model.filter = model.activeFilter;
        };

        model.showImport = function () {
            model.tab = 1;
        };

        model.showImportImages = function () {
            model.importProgress = "";
            model.tab = 5;
        };

        model.showAdd = function () {
            model.tab = 2;
            model.product = {};
            model.editing = false;
        };

        model.showTable = function () {
            model.tab = 3;
            model.newProduct();
        };

        model.clone = function (item) {
            return JSON.parse(JSON.stringify(item));
        };

        model.addProduct = function () {
            //preserve the model.product in case the add operation fails
            var uploadData = model.clone(model.product);
            if (uploadData.Id) {
                inventoryService.editProduct(uploadData);
            }
            else {
                inventoryService.addProduct(uploadData);
            }
        };

        model.onStartImport = function (text) {
            model.importProgress = text;
            model.tab = 6;
        }

        model.handleError = function (error) {
            model.tab = 6;
            if (error && error.toLowerCase().indexOf("<html", 0) >= 0) {
                //try to find the error message returned from the server
                try {
                    var parser = new DOMParser();
                    var dom = parser.parseFromString(error, "text/html");
                    var titleError = dom.getElementsByClassName("titleerror");
                    if (titleError) {
                        titleError = titleError.item(0);
                        if (titleError)
                            error = titleError.innerText;
                    }
                }
                catch (x) { }
                model.importProgress += "\n" + error;
            }
            else {
                model.importProgress += "\n" + error;
            }
        };

        model.findNode = function (node, name) {
            model.debugAlert(node);
            if (node.nodeName == name)
                return node;
            for (var i = 0; i<node.childElementCount; i++)
            {
                var child = model.findNode(node.childNodes[i], name);
                if (null != child)
                    return child;
            }
            return null;
        }

        model.importFile = function () {
            try
            {
                var fileinfo = document.getElementById("selectedfile").files[0];
                if (fileinfo == undefined)
                {
                    alert("Please select a file.");
                    return;
                }
                model.onStartImport("Importing " + fileinfo.name);
                inventoryService.importFile(fileinfo);
            }
            catch (error)
            {
                alert (error);
            }
        };

        model.importImages = function () {
            var files = document.getElementById("selectedimages").files;
            if (files == undefined || files.length == 0) {
                alert("Please select one or more image files.");
                return;
            }
            model.onStartImport("Importing " + files.length + " image(s)");
            for (var i = 0; i < files.length; i++)
            {
                var fileInfo = files[i];
                model.importProgress += "\nImporting " + fileInfo.name;
                inventoryService.importImage(fileInfo);
            }
        };

        model.edit = function (id) {
            for (var i = 0; i < model.products.length; i++) {
                var item = model.products[i];
                if (item.Id == id) {
                    model.product = model.buildProduct(item);
                    model.editing = true;
                    model.tab = 2;
                    return;
                }
            }
        };

        model.delete = function (id) {
            if (confirm("This will delete the selected item!"))
                inventoryService.deleteProduct(id);
        };

        model.fetchProducts = function () {
            var filter = model.activeFilter;
            inventoryService.fetchProducts(model.page * model.itemsPerPage, model.itemsPerPage, model.orderByColumn, model.orderAscending, filter);
        };

        model.newProduct = function () {
            model.product = {};
            model.editing = false;
            model.fetchAll();
        };

        model.buildProduct = function (item) {
            var result = model.clone(item);
            return result;
        };

        model.debugAlert = function (data) {
            alert(JSON.stringify(data));
        }

        model.FindLookup = function (list, id) {
            for (var i=0; i<list.length; i++)
            {
                if (list[i].Id == id)
                    return list[i];
            }
            return {};
        };

        model.fetchAll = function () {
            inventoryService.fetchUnitsOfMeasure();
            inventoryService.fetchProductTypes();
            inventoryService.fetchCategories();
            inventoryService.fetchContracts();
            inventoryService.fetchContractors();
            inventoryService.fetchImageFileNames();
            if (model.tab == 3) {
                model.fetchProducts();
                model.fetchPageCount();
            }
        };

        model.buildFilter = function () {
            var result = {};
            //todo: need to include the filter data here
            return result;
        }

        model.fetchPageCount = function () {
            inventoryService.fetchCount(model.activeFilter);
        };

        model.setPage = function(newPage)
        {
            if (!newPage || newPage < 0)
                newPage = 0;
            if (newPage > model.pageCount - 1)
                newPage = model.pageCount - 1;
            model.page = newPage;
            model.fetchProducts();
        }

        model.firstPage = function () {
            model.setPage(0);
        };

        model.priorPage = function () {
            model.setPage(model.page - 1);
        };

        model.nextPage = function () {
            model.setPage(model.page + 1);
        };

        model.lastPage = function () {
            model.setPage(model.pageCount);
        };

        messageService.subscribe('countSuccess', function (response) {
            model.pageCount = Math.ceil(response / model.itemsPerPage);
        })

        messageService.subscribe('countFailure', function (response) {
            model.pageCount = 1;
        })

        messageService.subscribe('importSuccess', function (response) {
            //alert('Import Success\r\n' + response);
            model.importProgress += "\n" + response;
            document.getElementById("fileImportForm").reset();
            model.fetchAll();
        })

        messageService.subscribe('importFailure', function (response) {
            model.handleError(response);
            //model.importProgress += "\nImport Failure: " + response;
        })

        messageService.subscribe('importImageSuccess', function (response) {
            model.importProgress += "\nImported " + response;
        })

        messageService.subscribe('importImageFailure', function (response) {
            model.handleError(response);
        })

        messageService.subscribe('addProductSuccess', function (response) {
            alert('Add Product Success');
            model.newProduct();
        })

        messageService.subscribe('addProductFailure', function (response) {
            model.handleError(response);
        })

        messageService.subscribe('updateProductSuccess', function (response) {
            alert('Update Product Success');
            model.newProduct();
        })

        messageService.subscribe('updateProductFailure', function (response) {
            model.handleError(response);
        })

        messageService.subscribe('retrievedUnitsOfMeasure', function (response) {
            model.unitsOfMeasure = response;
        })

        messageService.subscribe('retrievedUnitsOfMeasureFail', function (response) {
            model.unitsOfMeasure = [];
        })

        messageService.subscribe('retrievedProductTypes', function (response) {
            model.productTypes = response;
        })

        messageService.subscribe('retrievedProductTypesFail', function (response) {
            model.productTypes = [];
        })

        messageService.subscribe('retrievedCategories', function (response) {
            model.categories = response;
        })

        messageService.subscribe('retrievedCategoriesFail', function (response) {
            model.categories = [];
        })

        messageService.subscribe('retrievedContracts', function (response) {
            model.contracts = response;
        })

        messageService.subscribe('retrievedContractsFail', function (response) {
            model.contracts = [];
        })

        messageService.subscribe('retrievedContractors', function (response) {
            model.contractors = response;
        })

        messageService.subscribe('retrievedContractorsFail', function (response) {
            model.contractors = [];
        })

        messageService.subscribe('retrievedImageFileNames', function(response)
        {
            model.imageFileNames = response;
        })

        messageService.subscribe('retrievedImageFileNamesFail', function (response) {
            model.imageFileNames = [];
        })

        messageService.subscribe('querySuccess', function (response) {
            model.products = response;
        })

        messageService.subscribe('queryFailure', function (response) {
            model.products = [];
        })

        messageService.subscribe('deleteSuccess', function (response) {
            model.newProduct();
        })

        messageService.subscribe('deleteFailure', function (response) {
            model.handleError(response);
        })

        model.fetchAll();
    };

    module.component("inventory", {
        templateUrl: "app/areas/admin/inventory/inventory.html",
        controllerAs: "model",
        controller: ["$scope", "$location", "messageService", "inventoryService", controller]

    });

})();
