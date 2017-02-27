﻿(function () {
    "use strict";
    var module = angular.module("caWebApp");
    
    var controller = function ($scope, $location, messageService, reportService, orderByFilter) {
        var model = this;
        model.provider = {};
        model.title = "Reports";
        model.tab = 1;
        model.height = 400;
        model.width = 750;
        model.orderProducts = [];
        model.orderProductsOnPage = [];
        model.orderProductQuery = { Start: 0, End: 0 };
        model.sortColumn = "CreateDate";
        model.sortAscending = true;
        model.responseMessage = "";
        model.pageIndex = 0;
        model.numberOfPages = 1;
        model.pageCount = 10;
        model.pageCounts = [5, 10, 25, 50];
        model.hardwareColor = "#6495ED";
        model.softwareColor = "#FF7F50";
        model.serviceColor = "#A9A9A9";
        model.accountColors = [model.hardwareColor, model.softwareColor, model.serviceColor, "Gold"];
        model.contractors = [];
        model.contractorColumnWidth = 0;
        model.paymentAccounts = [];
        model.paymentAccountColumnWidth = 0;

        model.pieChart = function (context, height, width) {
            var chart = this;
            chart.context = context;
            chart.height = height;
            chart.width = width;
            chart.radius = Math.floor(Math.min(height, width) / 2);
            chart.centerX = Math.floor(width / 2);
            chart.centerY = Math.floor(height / 2);

            chart.fullSweep = 2.0 * Math.PI;
            chart.zero = -0.5 * Math.PI;
            chart.context.strokeStyle = "Black";

            chart.drawSlice = function (startPercent, sweepPercent, color) {
                chart.context.beginPath();
                chart.context.arc(chart.centerX, chart.centerY, chart.radius, chart.zero + startPercent * chart.fullSweep, chart.zero + sweepPercent * chart.fullSweep);
                chart.context.lineTo(chart.centerX, chart.centerY);
                chart.context.stroke();
                chart.context.fillStyle = color;
                chart.context.fill();
            };

            return chart;
        };

        model.setOrder = function (columnName) {
            if (columnName == model.sortColumn)
                model.sortAscending = !model.sortAscending;
            else {
                model.sortColumn = columnName;
                model.pageIndex = 0;
            }
            model.refreshTable();
        };

        model.showFilter = function () {
            model.tab = 1;
        };

        model.showExpendituresByProductType = function () {
            var context = model.initContext(2, "productTypeCanvas");

            var total = 0.0;
            var hardwareTotal = 0;
            var softwareTotal = 0;
            var serviceTotal = 0;
            for (var i = 0; i < model.orderProducts.length; i++) {
                var row = model.orderProducts[i];
                total += row.Total;
                if (model.orderProducts[i].ProductType == "Hardware")
                    hardwareTotal += row.Total;
                else if (model.orderProducts[i].ProductType == "Software")
                    softwareTotal += row.Total;
                else if (model.orderProducts[i].ProductType == "Service")
                    serviceTotal += row.Total;
            }
            var pieChart = model.pieChart(context, model.height, model.width);
            pieChart.drawSlice(0.0, hardwareTotal / total, model.hardwareColor);// "#6495ED");
            pieChart.drawSlice(hardwareTotal / total, (hardwareTotal + softwareTotal) / total, model.softwareColor);// "#FF7F50");
            pieChart.drawSlice((hardwareTotal + softwareTotal) / total, 1.0, model.serviceColor);// "#A9A9A9");
            model.drawLabels(context);
        };

        model.drawLabels = function (context) {
            model.drawCustomLabels(context, model.width - 100, 20,
                [
                    { color: model.hardwareColor, text: "Hardware" },
                    { color: model.softwareColor, text: "Software" },
                    { color: model.serviceColor, text: "Service" }
                ]);
        };

        model.drawCustomLabels = function (context, left, top, labels) {
            context.font = "16px Verdana";
            for (var i = 0; i < labels.length; i++)
                model.drawLabel(context, left, top + (i * 20), labels[i].color, labels[i].text);
        };

        model.drawLabel = function (context, left, top, color, text) {
            context.fillStyle = color;
            context.fillRect(left, top, 10, 10)
            context.fillStyle = "Black";
            context.fillText(text, left + 15, top + 10);
        };

        model.clearCanvas = function (context) {
            context.clearRect(0, 0, model.width, model.height);
        };

        model.showExpendituresByContractor = function () {
            var context = model.initContext(3, "contractorCanvas");

            model.contractors = [];
            model.contractorColumnWidth = 0;
            var contractors = model.extractContractors();
            if (!contractors || contractors.length == 0)
                return;
            model.contractors = contractors;
            model.contractorColumnWidth = Math.floor(model.width / model.contractors.length);
            var totals = model.initializeTotals(contractors.length);
            model.calculateTotals(totals, contractors, "Contractor");
            model.normalizeTotals(totals);
            model.drawTotals(context, totals);
            model.drawLabels(context);
        };

        model.drawTotals = function (context, totals) {
            //draw the data
            var padding = 20 * (totals.length + 1);
            var usableWidth = model.width - padding;
            var columnWidth = Math.floor(usableWidth / totals.length / 3) - 2;
            var left = 22;
            for (var i = 0; i < totals.length; i++) {
                var values = totals[i];
                var barHeight = Math.floor(model.height * values.hardwareTotal);
                model.drawBar(context, left, model.height - barHeight, columnWidth, barHeight, model.hardwareColor);

                left += columnWidth + 2;
                barHeight = Math.floor(model.height * values.softwareTotal);
                model.drawBar(context, left, model.height - barHeight, columnWidth, barHeight, model.softwareColor);

                left += columnWidth + 2;
                var barHeight = Math.floor(model.height * values.serviceTotal);
                model.drawBar(context, left, model.height - barHeight, columnWidth, barHeight, model.serviceColor);

                left += columnWidth + 2 + 20;
            }

        };

        model.findMaxInTotals = function (totals) {
            var max = Math.max(totals[0].hardwareTotal, totals[0].softwareTotal, totals[0].serviceTotal);
            for (var i = 1; i < totals.length; i++) {
                var temp = Math.max(totals[i].hardwareTotal, totals[i].softwareTotal, totals[i].serviceTotal);
                if (temp > max)
                    max = temp;
            }
            return max;
        };

        model.normalizeTotals = function (totals) {
            var max = model.findMaxInTotals(totals);
            for (var i = 0; i < totals.length; i++) {
                totals[i].hardwareTotal /= max;
                totals[i].softwareTotal /= max;
                totals[i].serviceTotal /= max;
            }
        };

        model.drawBar = function (context, x, y, width, height, color) {
            context.fillStyle = color;
            context.fillRect(x, y, width, height);
        };

        model.initializeTotals = function (count) {
            var totals = [];
            for (var i = 0; i < count; i++) {
                var values = { hardwareTotal: 0.0, softwareTotal: 0.0, serviceTotal: 0.0 };
                totals.push(values);
            }
            return totals;
        };

        model.extractContractors = function () {
            var result = [];
            for (var i = 0; i < model.orderProducts.length; i++) {
                if (!result.includes(model.orderProducts[i].Contractor)) {
                    result.push(model.orderProducts[i].Contractor);
                }
            }
            return result;
        };

        model.initContext = function (canvasTab, canvasName) {
            model.tab = canvasTab;
            var canvas = document.getElementById(canvasName);
            var context = canvas.getContext("2d");
            model.clearCanvas(context);
            return context;
        };

        model.showPurchaseTrends = function () {
            var context = model.initContext(6, "purchaseTrendsCanvas");
            model.paymentAccounts = [];
            var accounts = model.extractAccounts();
            if (!accounts || accounts.length == 0)
                return;
            accounts = orderByFilter(accounts, "length", false);
            model.paymentAccounts = accounts;
            var trends = model.initTrends(accounts);
            model.fillTrendData(trends);
            var maxTotal = model.findMaxTotalInTrends(trends);
            var labels = model.getAccountLabels(accounts);
            //this canvas taller than the others for drawing the labels - need to give the ui a chance to expand before drawing labels
            window.setTimeout(function () {
                for (var i = 0; i < trends.length; i++) {
                    model.drawTrend(context, trends[i], maxTotal, labels[i].color);
                }
                model.drawCustomLabels(context, 20, model.height, labels);
            }, 100);
        };

        model.drawTrend = function (context, trend, maxTotal, color) {
            var coordinates = [];
            for (var i = 0; i < trend.points.length; i++) {
                var point = trend.points[i];
                var x = model.calculateTrendX(point.date);
                var y = model.calculateTrendY(point.total, maxTotal);
                coordinates.push({ x: x, y: y });
            }
            context.beginPath();
            context.strokeStyle = color;
            context.moveTo(coordinates[0].x, coordinates[0].y);
            for (var i = 0; i < coordinates.length; i++) {
                context.lineTo(coordinates[i].x, coordinates[i].y);
                context.stroke();
            }
        }

        model.calculateTrendX = function (date) {
            var min = new Date(model.orderProductQuery.Start).setHours(0, 0, 0, 0);
            var max = reportService.getEndOfDay(new Date(model.orderProductQuery.End));
            var range = max - min;
            var delta = date - min;
            var percent = delta / range;
            return model.width * percent;
        };

        model.calculateTrendY = function (value, max) {
            var percent = value / max;
            //use model.height - 10 as the multiplier to pad the top by 10 pixels
            return Math.floor(model.height - ((model.height - 10) * percent));
        }

        model.findMaxTotalInTrends = function (trends) {
            if (!trends)
                return 0.0;
            var max = 0.0;
            for (var i = 0; i < trends.length; i++) {
                var temp = model.findMaxTotalInTrend(trends[i]);
                if (temp > max)
                    max = temp;
            }
            return max;
        };

        model.findMaxTotalInTrend = function (trend) {
            if (!trend.points)
                return 0;
            var max = 0.0;
            for (var i = 0; i < trend.points.length; i++) {
                if (trend.points[i].total > max)
                    max = trend.points[i].total;
            }
            return max;
        };

        model.fillTrendData = function (trends) {
            var products = orderByFilter(model.orderProducts, "CreateDate", false);
            for (var i = 0; i < model.orderProducts.length; i++) {
                var row = model.orderProducts[i];
                var date = new Date(row.CreateDate).setHours(0, 0, 0, 0);
                var trend = model.findTrend(trends, row.PaymentMethod)
                var dataPoint = model.findDataPoint(trend, date);
                dataPoint.total += row.Total;
            }
        };

        model.findDataPoint = function (trend, date) {
            for (var i = 0; i < trend.points.length; i++) {
                if (trend.points[i].date == date) {
                    return trend.points[i];
                }
            }
            var result = { date: date, total: 0.0 };
            trend.points.push(result);
            return result;
        };

        model.findTrend = function (trends, name) {
            for (var i = 0; i < trends.length; i++) {
                if (trends[i].name == name)
                    return trends[i];
            }
            return null;
        };

        model.initTrends = function (accounts) {
            var result = [];
            for (var i = 0; i < accounts.length; i++) {
                result.push({name: accounts[i], points:[]})
            }
            return result;
        };

        model.getAccountLabels = function (accounts) {
            var result = [];
            for (var i = 0; i < accounts.length; i++) {
                if (i < 4)
                    result.push({ color: model.accountColors[i], text: accounts[i] });
                else
                    result.push({ color: "Black", text: accounts[i] });//this should never happen
            }
            return result;
        };

        model.showPurchasesByAccount = function () {
            var context = model.initContext(4, "purchasesCanvas");

            model.paymentAccounts = [];
            model.paymentAccountColumnWidth = 0;
            var accounts = model.extractAccounts();
            if (!accounts || accounts.length == 0)
                return;
            model.paymentAccounts = accounts;
            model.paymentAccountColumnWidth = Math.floor(model.width / model.paymentAccounts.length);
            var totals = model.initializeTotals(accounts.length);
            model.calculateTotals(totals, accounts, "PaymentMethod");
            model.normalizeTotals(totals);
            model.drawTotals(context, totals);
            model.drawLabels(context);
        };

        model.calculateTotals = function (totals, list, key) {
            for (var i = 0; i < model.orderProducts.length; i++) {
                var row = model.orderProducts[i];
                var keyIndex = list.indexOf(row[key]);
                var values = totals[keyIndex];
                if (row.ProductType == "Hardware")
                    values.hardwareTotal += row.Total;
                else if (row.ProductType == "Software")
                    values.softwareTotal += row.Total;
                else if (row.ProductType == "Service")
                    values.serviceTotal += row.Total;
            }
        }

        model.extractAccounts = function () {
            var result = [];
            for (var i = 0; i < model.orderProducts.length; i++) {
                if (!result.includes(model.orderProducts[i].PaymentMethod)) {
                    result.push(model.orderProducts[i].PaymentMethod);
                }
            }
            return result;
        };

        model.showRawData = function () {
            model.tab = 5;
        };

        model.fetchOrderProducts = function () {
            reportService.fetchOrderProducts(model.orderProductQuery);
        };

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
            }
            model.responseMessage = error;
        };

        model.refreshTable = function () {
            model.orderProducts = orderByFilter(model.orderProducts, model.sortColumn, model.sortAscending);
            model.loadPage();
        };

        model.setPage = function (newPage) {
            if (!newPage || newPage < 0)
                newPage = 0;
            if (newPage > model.numberOfPages - 1)
                newPage = model.numberOfPages - 1;
            model.pageIndex = newPage;
            model.refreshTable();
        };

        model.loadPage = function () {
            model.orderProductsOnPage = [];
            model.numberOfPages = Math.floor(model.orderProducts.length / model.pageCount) + 1;
            var start = model.pageIndex * model.pageCount;
            for (var i = 0; i < model.pageCount; i++) {
                var index = start + i;
                if (index >= model.orderProducts.length)
                    break;
                model.orderProductsOnPage.push(model.orderProducts[index]);
            }
        };

        model.firstPage = function () {
            model.setPage(0);
        };

        model.priorPage = function () {
            model.setPage(model.pageIndex - 1);
        };

        model.nextPage = function () {
            model.setPage(model.pageIndex + 1);
        };

        model.lastPage = function () {
            model.setPage(model.numberOfPages);
        };

        model.initDateRange = function () {
            var start = new Date(Date.now());
            var year = start.getFullYear();
            var month = start.getMonth();
            if (month < 3)
                month = 0;
            else if (month < 6)
                month = 3;
            else if (month < 9)
                month = 6;
            else
                month = 9;
            start = new Date(year, month, 1);
            var end = new Date(new Date(year, month + 3, 0, 0, 0, 0, 0));
            model.orderProductQuery = { Start: start.toLocaleDateString(), End: end.toLocaleDateString() };
        };

        messageService.subscribe('getOrderProductsSuccess', function (response) {
            model.orderProducts = response;
            model.refreshTable();
            model.responseMessage = "Found " + response.length + " matching records";
        });

        messageService.subscribe('getOrderProductsFailure', function (response) {
            model.orderProducts = [];
            model.handleError(response);
        });

        model.initDateRange();
    };

    module.component("reports", {
        templateUrl: "app/areas/admin/reports/reports.html",
        controllerAs: "model",
        controller: ["$scope", "$location", "messageService", "reportService", "orderByFilter", controller]

    });
}())