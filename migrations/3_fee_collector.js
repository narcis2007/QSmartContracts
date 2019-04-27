const BigNumber = require('bignumber.js')

const QToken = artifacts.require("QToken");
const PaymentProcessor = artifacts.require("PaymentProcessor");
const DiscountManager = artifacts.require("DiscountManager");
const FeeCollector = artifacts.require("FeeCollector");

module.exports = async function (deployer) {

    QToken.deployed().then(token => {
        console.log('tokenAddress: ' + token.address);
        deployer.deploy(FeeCollector, token.address).then(() => {
            FeeCollector.deployed().then(feeCollector => {
                console.log('feeCollectorAddress: ' + feeCollector.address); // TODO: save the addressed in a file so I can do the wiring later with them
            });
        });
    });
};