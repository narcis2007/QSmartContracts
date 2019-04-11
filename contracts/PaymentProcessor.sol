pragma solidity ^0.5.0;

import "./QToken.sol";

contract PaymentProcessor {


    mapping(address => bool) loyaltyDiscountActive;
    mapping(address => uint) loyaltyDiscountPercentage;

    QToken token;

    constructor(address tokenAddress) public {
        token = QToken(tokenAddress);
    }

//TODO: add a transaction number/timestamp into the signature to act as a nonce-> I will use a timestamp first but we need to debate which is better later
    function processPayment(address merchantAddress, string memory product, uint256 price, uint256 timestamp, uint8 v, bytes32 r, bytes32 s) public {
        bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(merchantAddress, product, price, timestamp))));

        // Get the buyerAddress which signed the message
        address buyerAddress = ecrecover(hash, v, r, s);
        require(buyerAddress != address(0x0), 'buyerAddress is not valid!');

        //TODO: handle deals

        require(token.paymentProcessorTransferFrom(buyerAddress, merchantAddress, price, hash));
    }
}
