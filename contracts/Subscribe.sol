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

    function initialize(IERC20 token, uint256 duration, uint256 price) initializer public {

        _token = token;
        __AccessControl_init();
        // Set up roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(SUBSCRIBER_ROLE, msg.sender);

        subscriptionDuration = duration; // 1 MONTH
        subscriptionCost = price; // 1 ETH
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

    /*
    Fonction d'abonnement
    */
    function register() public {
        // Vérification que si l'abonné n'est pas déjà abonné
        require(subscriptionEndDates[msg.sender] < block.timestamp, "User is already subscribed");
        //Vérification de la balance si l'utilisateur à assez de token pour payer son abonnement
        require(_token.balanceOf(msg.sender) >= subscriptionCost, "Not enough tokens");

        // transfer du coût de l'abonnement en token (MTK) au smart contract
        _token.transferFrom(msg.sender, address(this), subscriptionCost);

        // Attribuer le rôle d'abonné à l'utilisateur
        _grantRole(SUBSCRIBER_ROLE,msg.sender);

        // Définir la date de fin d'abonnement --> 30 jours
        subscriptionEndDates[msg.sender] = block.timestamp + (subscriptionDuration * 30 days);

        emit SubscriptionRenewed(msg.sender, subscriptionEndDates[msg.sender]);
    }

    function isSubscribed(address user) public view returns(bool) {
    // Vérification de si l'utilisateur est abonnée ou pas en vérfiant la date de fin d'abonnement
        return subscriptionEndDates[user] > block.timestamp;
    }
    // Function de renouvellement d'abonnement
    function renew() public onlySubscribers{
        //Vérification est abonné ou pas
        require(subscriptionEndDates[msg.sender] >= block.timestamp, "User is not subscribed");
        // vérfie sa balance pour payer
        require(_token.balanceOf(msg.sender) >= subscriptionCost, "Not enough tokens");
        //transfer le coût de l'abonnement avec notre token
        _token.transferFrom(msg.sender, address(this), subscriptionCost);
        //Ajoute 30 jours en plus des jours qu'il a déjà selon sa date de fin d'abonnement
        subscriptionEndDates[msg.sender] += subscriptionDuration * 30 days;

        emit SubscriptionRenewed(msg.sender, subscriptionEndDates[msg.sender]);
    }
    // Retire tous les tokens contenu dans le smart contract au owner
    function withdraw() public onlyAdmin{
        _token.transferFrom(address(this), msg.sender, _token.balanceOf(address(this)));
    }
    // Définir la durée d'un abonnement
    function setSubscriptionDuration(uint256 _subscriptionDuration) public onlyAdmin{
        subscriptionDuration = _subscriptionDuration;
    }
    // Définir le coût d'un abonnement 
    function setSubscriptionCost(uint256 _subscriptionCost) public onlyAdmin{
        subscriptionCost = _subscriptionCost;
    }
    // Récupérer la date de fin d'abonnement d'un utilisateur
    function getSubscriptionEndDates(address addr) public onlyAdmin view returns(uint256){
        return subscriptionEndDates[addr];
    }
    // Vérifié le rôle pour un abonné 
    function access() public onlySubscribers view returns(string memory) {
        require(subscriptionEndDates[msg.sender] >= block.timestamp, "User is not subscribed");
        return "An amazing string!";
    }
    // Enlever le rôle de "SUBSCRIBER_ROLE", possible que par l'admin
    function revoke(address account) public onlyAdmin{
        revokeRole(SUBSCRIBER_ROLE, account);
    }
}
// Simple contrat de création de 1000MTK
contract MyToken is ERC20{
    constructor() ERC20("MyToken", "MTK"){
        _mint(msg.sender, 10000 * 10 ** decimals());
    }
    
}