//SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";


contract Subscribe is AccessControlUpgradeable{

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SUBSCRIBER_ROLE = keccak256("SUBSCRIBER_ROLE");

    uint256 public subscriptionDuration;
    uint256 public subscriptionCost;

    mapping(address => uint256) public subscriptionEndDates;
    IERC20 private _token;

    function initialize(IERC20 token) initializer public {

        _token = token;
        __AccessControl_init();
        // Set up roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);

        subscriptionDuration = 1; // 1 MONTH
        subscriptionCost = 1; // 1 MATIC
    }

    event SubscriptionRenewed(address indexed user, uint256 endDate);

    // Modifier to restrict access to only members
    modifier onlySubscribers() {
        require(hasRole(SUBSCRIBER_ROLE, msg.sender), "Restricted to subscribers");
        _;
    }

    // Modifier to restrict access to only admins
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    function register() public {
        require(subscriptionEndDates[msg.sender] < block.timestamp, "User is already subscribed");
        require(_token.balanceOf(msg.sender) > subscriptionCost, "Not enought token");

        _token.transferFrom(msg.sender, address(this), subscriptionCost);
    
        _setupRole("SUBSCRIBER_ROLE",msg.sender);

        subscriptionEndDates[msg.sender] = block.timestamp + (subscriptionDuration * 30 days);

        emit SubscriptionRenewed(msg.sender, subscriptionEndDates[msg.sender]);
    }

    function isSubscribed(address user) public view returns(bool) {
        return subscriptionEndDates[user] > block.timestamp;
    }

    function renew() public onlySubscribers{
        require(subscriptionEndDates[msg.sender] >= block.timestamp, "User is not subscribed");
        require(_token.balanceOf(msg.sender) > subscriptionCost, "Not enought token");
        _token.transferFrom(msg.sender, address(this), subscriptionCost);

        subscriptionEndDates[msg.sender] += subscriptionDuration * 30 days;

        emit SubscriptionRenewed(msg.sender, subscriptionEndDates[msg.sender]);
    }

    function withdraw() public onlyAdmin{
        _token.transferFrom(address(this), msg.sender, _token.balanceOf(address(this)));
    }
    
    function setSubscriptionDuration(uint256 _subscriptionDuration) public onlyAdmin{
        subscriptionDuration = _subscriptionDuration;
    }
    function setSubscriptionCost(uint256 _subscriptionCost) public onlyAdmin{
        subscriptionCost = _subscriptionCost;
    }
    function access() public onlySubscribers view returns(string memory) {
        require(subscriptionEndDates[msg.sender] >= block.timestamp, "User is not subscribed");
        return "An amazing string!";
    }
    function revoke(address account) public onlyAdmin{
        revokeRole(SUBSCRIBER_ROLE, account);
    }
}
contract MyToken is Context, ERC20{
    constructor() public ERC20("MyToken", "MTK"){
        _mint(msg.sender, 10000*10**decimals());
    }
    
}