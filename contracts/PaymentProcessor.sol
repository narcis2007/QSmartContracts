pragma solidity ^0.5.0;

import "./QToken.sol";

contract PaymentProcessor {

    mapping(bytes32 => bool) paymentsProcessed;
    QToken token;

    constructor(address tokenAddress) public {
        token = QToken(tokenAddress);
    }

    function processPayment(address merchantAddress, string memory product, uint256 price, uint8 v, bytes32 r, bytes32 s) public {
        bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(merchantAddress, product, price))));

        require(paymentsProcessed[hash] == false);

        // Get the buyerAddress which signed the message
        address buyerAddress = ecrecover(hash, v, r, s);
        require(buyerAddress != address(0x0), 'buyerAddress is not valid!');

        token.paymentProcessorTransferFrom(buyerAddress, merchantAddress, price);
        paymentsProcessed[hash] = true;
    }
}
