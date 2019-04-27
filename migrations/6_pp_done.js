const BigNumber = require('bignumber.js')

const QToken = artifacts.require("QToken");
const PaymentProcessor = artifacts.require("PaymentProcessor");
const DiscountManager = artifacts.require("DiscountManager");
const FeeCollector = artifacts.require("FeeCollector");

module.exports = async function (deployer) {

    PaymentProcessor.deployed().then(paymentProcessor => {
        console.log('paymentProcessorAddress: ' + paymentProcessor.address);
    });
};