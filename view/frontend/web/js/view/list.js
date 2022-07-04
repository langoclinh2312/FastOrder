define([
    'ko',
    'jquery',
    'uiComponent',
    'mage/url',
    'mage/storage',
    'Magento_Customer/js/customer-data',
    'mage/cookies'
], function(ko, $, Component, urlBuilder, storage, cookies) {
    'use strict';


    return Component.extend({

        defaults: {
            template: 'AHT_FastOrder/list',
        },

        keyWord: ko.observable(''),
        productList: ko.observableArray([]),
        products: ko.observableArray([]),
        chosenItems: ko.observableArray([]),
        totalQty: ko.observable(0),
        subTotal: ko.observable(0),
        lineNumber: ko.observable(0),

        delete: function(data) {
            const self = this;
            self.products().forEach(element => {
                if (element.entity_id == data.entity_id) {
                    self.products.remove(element);
                    self.totalQty(self.totalQty() - element.qty);
                    self.subTotal((parseFloat(self.subTotal()) - parseFloat(element.price * element.qty)).toFixed(2));
                }
            });
            self.isCheck();
            self.lineNumber(self.products().length);
        },

        changeQty: function(data) {
            const self = this;
            if (data.qty > 0 && Number.isInteger(parseInt(data.qty)) == true) {
                data.total = (data.price * data.qty).toFixed(2);

                self.products().forEach(element => {
                    if (element.entity_id == data.entity_id) {
                        const index = self.products.indexOf(element)
                        self.products.replace(self.products()[index], {
                            ...self.products()[index],
                            qty: parseInt(data.qty),
                            total: data.total
                        });
                        const totalQty = self.products().reduce(function(acc, obj) { return acc + obj.qty; }, 0);
                        self.totalQty(totalQty);
                        const subTotal = self.products().reduce(function(acc, obj) { return acc + parseFloat(obj.total); }, 0);
                        self.subTotal(subTotal);
                    }
                });

            }
        },

        minusQty: function(data) {
            const self = this;
            if (data.qty > 1) {
                data.qty = data.qty - 1;
                data.total = (data.price * data.qty).toFixed(2);

                const index = self.products.indexOf(data)
                self.products.replace(self.products()[index], {
                    ...self.products()[index],
                    qty: data.qty,
                    total: data.total
                });
                self.totalQty(self.totalQty() - 1);
                self.subTotal((parseFloat(self.subTotal()) - parseFloat(data.price)).toFixed(2));
            }
        },

        plusQty: function(data) {
            const self = this;
            data.qty = data.qty + 1;
            data.total = (data.price * data.qty).toFixed(2);

            const index = self.products.indexOf(data)
            self.products.replace(self.products()[index], {
                ...self.products()[index],
                qty: data.qty,
                total: data.total
            });

            self.totalQty(self.totalQty() + 1);
            self.subTotal((parseFloat(self.subTotal()) + parseFloat(data.price)).toFixed(2));
        },

        getProduct: function(elm, data) {
            const self = this;
            if (elm.checked) {
                data.qty = 1;
                data.total = (data.price * data.qty).toFixed(2);
                self.products.push(data);
                if (self.totalQty() == 0 && self.subTotal() == 0) {
                    self.totalQty(data.qty);
                    self.subTotal((parseFloat(data.total)).toFixed(2));
                } else {
                    self.totalQty(self.totalQty() + data.qty);
                    self.subTotal((parseFloat(self.subTotal()) + parseFloat(data.total)).toFixed(2));
                }
            } else {
                self.products().forEach(element => {
                    if (element.entity_id == data.entity_id) {
                        self.products.remove(element);
                        self.totalQty(self.totalQty() - element.qty);
                        self.subTotal((parseFloat(self.subTotal()) - parseFloat(element.price * element.qty)).toFixed(2));
                    }
                });
            }
            self.lineNumber(self.products().length);
        },

        getProductSearch: function() {
            const self = this;
            const serviceUrl = urlBuilder.build('fast/ajax/product?key=' + self.keyWord());

            return $.ajax({
                url: serviceUrl,
                type: 'GET',
                dataType: 'json',
                timeout: 10000,
                beforeSend: function() {
                    $('.content').addClass('loading');
                },
                success: function(response) {
                    self.productList(response);
                    self.isCheck();
                },
                error: function(textStatus) {
                    if (textStatus === 'timeout') {
                        $('.table-content').removeClass('loading');
                    }
                },
                complete: function() {
                    $('.content').removeClass('loading');
                }
            });
        },

        isCheck: function() {
            const self = this;
            if (self.productList() != null) {
                self.productList().forEach((element, index) => {
                    const check = self.products().findIndex(elm => element.entity_id == elm.entity_id);
                    if (check >= 0) {
                        self.productList.replace(self.productList()[index], {
                            ...self.productList()[index],
                            is_check: true,
                        });
                    } else {
                        self.productList.replace(self.productList()[index], {
                            ...self.productList()[index],
                            is_check: false,
                        });
                    }
                });
            }
        },

        addToCart: function() {
            const self = this;
            let formKey = $.mage.cookies.get('form_key');
            let newData = {};
            self.products().forEach(element => {
                newData = {
                    product: element.entity_id,
                    item: element.entity_id,
                    form_key: formKey,
                    super_attribute: element.super_attributes,
                    qty: element.qty
                };
                self.cartAjax(newData, element.entity_id);
            });
        },

        cartAjax: function(data, productId) {
            const self = this;
            const serviceUrl = urlBuilder.build('checkout/cart/add/product/' + productId + '/');

            return $.ajax({
                url: serviceUrl,
                type: 'POST',
                dataType: 'json',
                timeout: 3000000,
                beforeSend: function() {
                    $('.table-content').addClass('loading');
                },
                data: data,
                success: function() {
                    self.products.removeAll();
                    self.isCheck();
                    self.totalQty(0);
                    self.subTotal(0);
                    self.lineNumber(0);
                },
                error: function(response) {
                    console.log(response);
                },

                complete: function() {
                    $('.table-content').removeClass('loading');
                }
            });
        },

        tabSearch: function() {
            $(document).on('click', function(e) {
                let container = $("#content-search");
                if (!$(e.target).closest('.search-product').length) {
                    container.removeClass('show');
                }
            });

            $("#keyWord").on('click', function() {
                let container = $("#content-search");
                container.addClass('show');
            });
        },
    });
});