using Microsoft.AspNetCore.Mvc;
using APISQL_SERVER.Services;
using System.Net;

namespace APISQL_SERVER.Controllers
{
    //[ApiController]
    [Route("[controller]")]
    public class CadastrosController : ControllerBase
    {
        private readonly SqlService _sqlService;

        public CadastrosController(SqlService sqlService)
        {
            _sqlService = sqlService;
        }

        /// <summary>
        /// Retorna uma mensagem de teste para verificar se a API está funcionando.
        /// </summary>
        /// <param name="IdEmpresa">Código identificador da empresa (opcional).</param>
        [HttpGet("TesteAPI")]
        public async Task<IActionResult> TesteAPI([FromQuery] string IdEmpresa)
        {
            // ⚠️ se o parâmetro não vier, retorna só a SUA mensagem
            if (string.IsNullOrEmpty(IdEmpresa))
            {
                return BadRequest(new
                {
                    mensagem = "Parâmetro 'IdEmpresa' não foi informado."
                });
            }

            var query = "SELECT 'API Funcionando 2!' AS Mensagem";

            await _sqlService.ExecSQLQuery(query, HttpContext);

            // Como o SqlService já escreve a resposta, não precisa retornar nada
            return new EmptyResult();
        }

        [HttpGet("Usuarios")]
        public async Task<IActionResult> Usuarios([FromQuery] string IdEmpresa)
        {
            // ⚠️ se o parâmetro não vier, retorna só a SUA mensagem
            if (string.IsNullOrEmpty(IdEmpresa))
            {
                return BadRequest(new
                {
                    mensagem = "Parâmetro 'IdEmpresa' não foi informado."
                });
            }

            var query = $"SELECT * From startapp_magicroute..Usuarios where IDEmpresa = '{IdEmpresa}'";

            await _sqlService.ExecSQLQuery(query, HttpContext);

            // Como o SqlService já escreve a resposta, não precisa retornar nada
            return new EmptyResult();
        }

    }
}
