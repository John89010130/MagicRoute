using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace APISQL_SERVER.Services
{
    public class SqlService
    {
        private readonly string _connectionString = "Data Source=localhost\\startapp;Initial Catalog=master;User Id=sa;Password=cia@2023;";

        public async Task ExecSQLQuery(string sqlQuery, HttpContext context)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();

                using var command = new SqlCommand(sqlQuery, connection);
                using var reader = await command.ExecuteReaderAsync();

                var result = new StringWriter();
                result.Write("[");
                bool first = true;

                while (await reader.ReadAsync())
                {
                    if (!first) result.Write(",");
                    first = false;

                    result.Write("{");
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        if (i > 0) result.Write(",");
                        result.Write($"\"{reader.GetName(i)}\":\"{reader.GetValue(i)}\"");
                    }
                    result.Write("}");
                }
                result.Write("]");

                context.Response.ContentType = "application/json; charset=utf-8";
                await context.Response.WriteAsync(result.ToString(), Encoding.UTF8);
            }
            catch (Exception ex)
            {
                await HandleError(ex, sqlQuery, context);
            }
        }

        public async Task ExecSQLQueryJson(string sqlQuery, HttpContext context)
        {
            try
            {
                using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();

                using var command = new SqlCommand(sqlQuery, connection);
                using var reader = await command.ExecuteReaderAsync();

                var result = new List<Dictionary<string, object>>();

                while (await reader.ReadAsync())
                {
                    var row = new Dictionary<string, object>();
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    }
                    result.Add(row);
                }

                context.Response.ContentType = "application/json; charset=utf-8";
                await context.Response.WriteAsync(JsonSerializer.Serialize(result), Encoding.UTF8);
            }
            catch (Exception ex)
            {
                await HandleError(ex, sqlQuery, context);
            }
        }

        private static async Task HandleError(Exception ex, string query, HttpContext context)
        {
            Console.WriteLine($"[ERRO SQL] {ex.Message}");
            Console.WriteLine($"Query: {query}");
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            await context.Response.WriteAsync($"{{\"error\":\"{ex.Message}\", \"query\":\"{query.Replace("\"", "\\\"")}\"}}");
        }
    }
}
