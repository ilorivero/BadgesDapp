// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title BadgeRepositoryMulti
 * @dev Contrato para que usuários possam receber múltiplas badges únicas por título.
 * Apenas o proprietário do contrato pode emitir novas badges.
 */
contract BadgeRepositoryMulti {

    address public owner;

    enum BadgeType {
        CURSO,
        PROJETO,
        EVENTO,
        CONTRIBUICAO
    }

    struct Badge {
        string titulo;
        string descricao;
        string nomeEmissor;
        uint256 dataEmissao;
        uint256 dataValidade; // 0 para nunca expirar
        string urlEvidencia;
        BadgeType tipoDeBadge;
        bool emitida; // Flag para verificar existência de forma mais barata
    }

    // Mapeamento aninhado: endereço do recebedor -> título da badge -> struct da Badge
    mapping(address => mapping(string => Badge)) public badges;

    // Mapeamento para armazenar a lista de títulos de badges de cada usuário
    mapping(address => string[]) private titulosDasBadges;

    event BadgeRegistrada(
        address indexed recebedor,
        string titulo,
        string nomeEmissor,
        BadgeType indexed tipoDeBadge
    );

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Acao restrita ao proprietario do contrato.");
        _;
    }

    /**
     * @dev Registra uma nova badge para um usuário, desde que ele já não possua uma com o mesmo título.
     * @param _recebedor O endereço que receberá a badge.
     * @param _titulo O título único da badge (usado como ID).
     * @param _descricao Uma descrição detalhada da conquista.
     * @param _nomeEmissor O nome da entidade emissora.
     * @param _dataValidade A data de validade da badge (0 se não houver).
     * @param _urlEvidencia Uma URL para evidência da conquista.
     * @param _tipoDeBadge O tipo de badge.
     */
    function registrarBadge(
        address _recebedor,
        string memory _titulo,
        string memory _descricao,
        string memory _nomeEmissor,
        uint256 _dataValidade,
        string memory _urlEvidencia,
        BadgeType _tipoDeBadge
    ) public onlyOwner {
        require(!badges[_recebedor][_titulo].emitida, "O usuario ja possui uma badge com este titulo.");
        require(bytes(_titulo).length > 0, "O titulo nao pode ser vazio.");

        badges[_recebedor][_titulo] = Badge({
            titulo: _titulo,
            descricao: _descricao,
            nomeEmissor: _nomeEmissor,
            dataEmissao: block.timestamp,
            dataValidade: _dataValidade,
            urlEvidencia: _urlEvidencia,
            tipoDeBadge: _tipoDeBadge,
            emitida: true
        });

        // Adiciona o título à lista de badges do usuário
        titulosDasBadges[_recebedor].push(_titulo);

        emit BadgeRegistrada(_recebedor, _titulo, _nomeEmissor, _tipoDeBadge);
    }

    /**
     * @dev Retorna os detalhes de uma badge específica de um usuário.
     * @param _recebedor O endereço do proprietário da badge.
     * @param _titulo O título da badge a ser consultada.
     * @return A struct com as informações da badge.
     */
    function getBadgePorTitulo(address _recebedor, string memory _titulo) public view returns (Badge memory) {
        require(badges[_recebedor][_titulo].emitida, "Badge nao encontrada para este usuario e titulo.");
        return badges[_recebedor][_titulo];
    }

    /**
     * @dev Retorna a lista de títulos de todas as badges que um usuário possui.
     * @param _recebedor O endereço do usuário.
     * @return Um array de strings com os títulos das badges.
     */
    function getTitulosDasBadgesDoUsuario(address _recebedor) public view returns (string[] memory) {
        return titulosDasBadges[_recebedor];
    }

    /**
     * @dev Retorna a quantidade de badges que um usuário possui.
     * @param _recebedor O endereço do usuário.
     * @return O número de badges.
     */
    function getContagemDeBadges(address _recebedor) public view returns (uint256) {
        return titulosDasBadges[_recebedor].length;
    }
    
    /**
     * @dev Verifica se uma badge específica ainda é válida.
     * @param _recebedor O endereço do proprietário da badge.
     * @param _titulo O título da badge a ser verificada.
     * @return 'true' se a badge for válida, 'false' caso contrário.
     */
    function isBadgeValida(address _recebedor, string memory _titulo) public view returns (bool) {
        require(badges[_recebedor][_titulo].emitida, "Badge nao encontrada.");
        
        Badge memory badge = badges[_recebedor][_titulo];
        if (badge.dataValidade == 0) {
            return true; // Nunca expira
        }
        
        return block.timestamp <= badge.dataValidade;
    }
}