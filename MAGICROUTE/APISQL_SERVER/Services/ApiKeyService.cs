using System;
using System.Data.SqlClient;
using System.Threading.Tasks;

namespace APISQL_SERVER.Services
{
    public class ApiKeyService
    {
        private readonly string _connectionString =
            "Data Source=localhost\\startapp;Initial Catalog=master;User Id=sa;Password=cia@2023;";

        // ✅ Método async que valida se a ApiKey pertence à empresa
        public async Task<bool> ValidarApiKeyAsync( string apiKey)
        {
            // Verificações iniciais
            if (string.IsNullOrWhiteSpace(apiKey))
                return false;

            const string query = @"
                SELECT COUNT(*) 
                FROM startapp_magicroute..Empresas 
                WHERE ApiKey = @ApiKey";

            try
            {
                using (var connection = new SqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    using (var command = new SqlCommand(query, connection))
                    {
                       
                        command.Parameters.AddWithValue("@ApiKey", apiKey);

                        var result = await command.ExecuteScalarAsync();

                        // Garante conversão segura
                        if (result == DBNull.Value || result == null)
                            return false;

                        return Convert.ToInt32(result) > 0;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao validar ApiKey: {ex.Message}");
                return false;
            }
        }
    }
}
