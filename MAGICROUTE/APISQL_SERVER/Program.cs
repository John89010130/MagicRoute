using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using System.Net;
using System.Data.SqlClient;
using Microsoft.AspNetCore.Http;
using System.Text;
using System.IO;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System.Text.Json;
using APISQL_SERVER.Services;
using Microsoft.AspNetCore.Localization;
using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SwaggerThemes;


namespace APISQL_SERVER
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            var supportedCultures = new[] { new CultureInfo("pt-BR") };

            builder.Services.AddLocalization(options => options.ResourcesPath = "Resources");

            builder.Services.Configure<RequestLocalizationOptions>(options =>
            {
                options.DefaultRequestCulture = new RequestCulture("pt-BR");
                options.SupportedCultures = supportedCultures;
                options.SupportedUICultures = supportedCultures;
            });

            // Adicionar serviços ao contêiner.
            builder.Services.AddControllers();
            builder.Services.AddScoped<SqlService>();
            builder.Services.AddEndpointsApiExplorer();



            // Configurar o CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll",
                    builder => builder.AllowAnyOrigin()
                                      .AllowAnyHeader()
                                      .AllowAnyMethod());
            });

            // Configurar o Swagger/OpenAPI
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "Minha API",
                    Version = "v1",
                    Description = "API protegida por chave de acesso (x-api-key)"
                });
                c.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
                {
                    Description = "Informe a chave de API no formato: x-api-key",
                    Type = SecuritySchemeType.ApiKey,
                    Name = "x-api-key",
                    In = ParameterLocation.Header,
                    Scheme = "ApiKeyScheme"
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "ApiKey"
                            },
                            In = ParameterLocation.Header
                        },
                        new string[] {}
                    }
                });
            });
            builder.Services.AddSingleton<ApiKeyService>();
           


            var app = builder.Build();


            var locOptions = app.Services.GetRequiredService<IOptions<RequestLocalizationOptions>>();
            app.UseRequestLocalization(locOptions.Value);

            var defaultCulture = new CultureInfo("pt-BR");
            var localizationOptions = new RequestLocalizationOptions
            {
                DefaultRequestCulture = new RequestCulture(defaultCulture),
                SupportedCultures = new List<CultureInfo> { defaultCulture },
                SupportedUICultures = new List<CultureInfo> { defaultCulture }
            };

            CultureInfo.DefaultThreadCurrentCulture = new CultureInfo("pt-BR");
            CultureInfo.DefaultThreadCurrentUICulture = new CultureInfo("pt-BR");
            
            
            app.UseStaticFiles();


            // Configurar o pipeline de solicitação HTTP.

            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "MagicRoute API v1");
                c.RoutePrefix = "swagger";
                c.DocumentTitle = "MagicRoute API";
                c.InjectStylesheet("custom.css");
            });



            app.UseHttpsRedirection();
            app.UseCors("AllowAll"); // Adicionar o middleware CORS
            app.UseAuthorization();
            // Adicionar o middleware CORS antes de UseAuthorization
            
            

            app.MapGet("/Inicio", async context =>
            {
                await context.Response.WriteAsync("{\"message\":\"API MAGIC ROUTE Funcionando!\"}");
            });
            //Aplicativo Magic Route
            //BuscaEndereçoURL
            app.MapGet("/UrlCliente", async context =>
            {
                var CNPJ = context.Request.Query["CNPJ"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(CNPJ))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro CNPJ não fornecido.\"}");
                    return;
                }

                var query = $"SELECT * FROM startapp_magicroute..empresas WHERE CNPJ = '{CNPJ}'";
                await ExecSQLQuery(query, context);
            });
            //BuscaUsuario
            app.MapGet("/BuscaUsuario", async context =>
            {
                var IdEmpresa = context.Request.Query["IdEmpresa"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(IdEmpresa))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IdEmpresa não fornecido.\"}");
                    return;
                }
                var TipoPessoa = context.Request.Query["TipoPessoa"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(TipoPessoa))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro TipoPessoa não fornecido.\"}");
                    return;
                }
                var Codigo = context.Request.Query["Codigo"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(Codigo))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro Codigo não fornecido.\"}");
                    return;
                }
                var Senha = context.Request.Query["Senha"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(Senha))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro Senha não fornecido.\"}");
                    return;
                }

                var query = $"Select * from startapp_magicroute..Usuarios\r\nwhere idempresa = '{IdEmpresa}' and tipopessoa = '{TipoPessoa}' and codigo = '{Codigo}' and senha = '{Senha}' ";
                await ExecSQLQuery(query, context);
            });
            //BuscaEntregasData
            app.MapGet("/BuscaEntregasData", async context =>
            {
                var IdEmpresa = context.Request.Query["IdEmpresa"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(IdEmpresa))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IdEmpresa não fornecido.\"}");
                    return;
                }
                var CodigoMotorista = context.Request.Query["CodigoMotorista"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(CodigoMotorista))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro CodigoMotorista não fornecido.\"}");
                    return;
                }
                var DataIncial = context.Request.Query["DataIncial"].ToString().Replace("'", "''");
                if (string.IsNullOrWhiteSpace(DataIncial))
                {
                    DataIncial = DateTime.Today.ToString("dd/MM/yyyy");
                }

                var DataFinal = context.Request.Query["DataFinal"].ToString().Replace("'", "''");
                if (string.IsNullOrWhiteSpace(DataFinal))
                {
                    DataFinal = DataIncial;
                }


                var query = $"Select " +
                $"ent.IDLote, ent.LocalSaida, ent.DataEntrega, ent.Veiculo, ent.UrlVeiculo, ent.PlacaEntrega, count(distinct pend.NrNotaFiscal) Pendente, count(distinct Entregue.NrNotaFiscal) Entregue, " +
                $"count(distinct  EmTransporte.NrNotaFiscal) EmTransporte " +
                $"from startapp_magicroute..Entregas ent " +
                $"Left join (" +
                $"Select NrNotaFiscal,IDEmpresa,IDLote from startapp_magicroute..Entregas where StatusEntrega = 'Pendente'" +
                $") Pend " +
                $"on pend.IDEmpresa = ent.IDEmpresa and Pend.IDLote = ent.IDLote " +
                $"Left join ( " +
                $"Select NrNotaFiscal,IDEmpresa,IDLote from startapp_magicroute..Entregas where StatusEntrega = 'Entregue'" +
                $") Entregue " +
                $"on Entregue.IDEmpresa = ent.IDEmpresa and Entregue.IDLote = ent.IDLote " +
                $"Left join (" +
                $"Select NrNotaFiscal,IDEmpresa,IDLote from startapp_magicroute..Entregas where StatusEntrega = 'Em Transporte'" +
                $") EmTransporte " +
                $"on EmTransporte.IDEmpresa = ent.IDEmpresa and EmTransporte.IDLote = ent.IDLote " +
                $"where ent.IDEmpresa = {IdEmpresa} and ent.CodigoMotorista = {CodigoMotorista} and cast(ent.DataEntrega as date) between '{DataIncial}' and '{DataFinal}'  " +
                $"Group by ent.IDLote,ent.LocalSaida,ent.DataEntrega,ent.Veiculo,ent.PlacaEntrega,ent.UrlVeiculo";
                await ExecSQLQuery(query, context);
            });

            //BuscaEntregasIDLote
            app.MapGet("/BuscaEntregasIDLote", async context =>
            {
                var IdEmpresa = context.Request.Query["IdEmpresa"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(IdEmpresa))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IdEmpresa não fornecido.\"}");
                    return;
                }
                var CodigoMotorista = context.Request.Query["CodigoMotorista"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(CodigoMotorista))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro CodigoMotorista não fornecido.\"}");
                    return;
                }
                var IDLote = context.Request.Query["IDLote"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(IDLote))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDLote não fornecido.\"}");
                    return;
                }


                var query = $"Select * " +
                $"from startapp_magicroute..Entregas ent " +
                $"where ent.IDEmpresa = {IdEmpresa} and ent.CodigoMotorista = {CodigoMotorista} and ent.IDLote = {IDLote} " +
                $" order by ent.SequenciaRoteirizada,ent.SequenciaOriginal asc ";
                await ExecSQLQuery(query, context);
            });
            //RoteirizaIDLote
            app.MapPost("/RoteirizaIDLote", async context =>
            {
                var IDEmpresa = context.Request.Form["IDEmpresa"].ToString();
                var IDLote = context.Request.Form["IDLote"].ToString();
                var OtimizarRota = context.Request.Form["OtimizarRota"].ToString();

                var query = $"exec master..ExecutaRoteirizacao {IDEmpresa},{IDLote},{OtimizarRota}";

                await ExecSQLQuery(query, context);
            });

            app.MapGet("/Dashboard", async context =>
            {
                var IdEmpresa = context.Request.Query["IdEmpresa"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(IdEmpresa))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IdEmpresa não fornecido.\"}");
                    return;
                }


                var query = $"Select * from  startapp_magicroute..DadosDashBoard({IdEmpresa}) ";
                await ExecSQLQuery(query, context);
            });
            


            //Aplicativo CiaCargas

            //Usuarios
            app.MapGet("/usuarios", async context =>
            {
                await ExecSQLQuery("SELECT * from startapp..usuarios", context);
            });

            app.MapGet("/usuarios/detalhe", async context =>
            {
                var Usuario = context.Request.Query["Usuario"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(Usuario))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro Cod não fornecido.\"}");
                    return;
                }

                var query = $"SELECT * FROM startapp..usuarios WHERE Usuario = '{Usuario}'";
                await ExecSQLQuery(query, context);
            });

            //PedidosCargas
            app.MapGet("/PedidosCarga", async context =>
            {
                var id = context.Request.Query["id"];
                var Situacao = context.Request.Query["Situacao"];
                var Dataincio = context.Request.Query["Dataincio"];
                var datafim = context.Request.Query["datafim"];

                var query = $"Select * from startapp..pedidoscarga where 1 = 1";

                if (!string.IsNullOrEmpty(id) && id != "0")
                {
                    query += $" AND id = {id}";
                }
                if (!string.IsNullOrEmpty(Situacao) && Situacao != "0")
                {
                    query += $" AND Situacao = '{Situacao}'";
                }
                if (!string.IsNullOrEmpty(Dataincio) && Dataincio != "0")
                {
                    query += $" AND Dataincio = '{Dataincio}'";
                }
                if (!string.IsNullOrEmpty(datafim) && datafim != "0")
                {
                    query += $" AND datafim = '{datafim}'";
                }

                await ExecSQLQuery(query, context);
            });
            app.MapPost("/CriaCarga", async context =>
            {
                var query = $"Declare @ID int = isnull((Select max(id) from startapp..pedidoscarga),0)+1 " +
                $"insert into startapp..pedidoscarga (ID,SITUACAO) " +
                $"Select @ID,'Em Aberto' " +
                $"Select @ID as ID";
                await ExecSQLQuery(query, context);

            });
                //Atualiza Carga
                app.MapPost("/AtualizaCarga", async context =>
            {
                var IDCARGA = context.Request.Form["IDCARGA"].ToString();
                var TITULOCARGA = context.Request.Form["TITULOCARGA"].ToString();
                var CAPACIDADE = context.Request.Form["CAPACIDADE"].ToString();
                var COMENTARIO = context.Request.Form["COMENTARIO"].ToString();
                var IDCLIENTE = context.Request.Form["IDCLIENTE"].ToString();
                var NOMECLIENTE = context.Request.Form["NOMECLIENTE"].ToString();
                var CARREGAMENTO = context.Request.Form["CARREGAMENTO"].ToString();
                var AGENDA = context.Request.Form["AGENDA"].ToString();
                var SITUACAO = context.Request.Form["SITUACAO"].ToString();
                var PESOKG = context.Request.Form["PESOKG"].ToString();
                var VALORFRETE = context.Request.Form["VALORFRETE"].ToString();
                var ADIANTAMENTO = context.Request.Form["ADIANTAMENTO"].ToString();
                var OBSERVACOES = context.Request.Form["OBSERVACOES"].ToString();
                var OrigemUF = context.Request.Form["OrigemUF"].ToString();
                var OrigemCidade = context.Request.Form["OrigemCidade"].ToString();
                var OrigemCEP = context.Request.Form["OrigemCEP"].ToString();
                var OrigemEndereco = context.Request.Form["OrigemEndereco"].ToString();
                var OrigemNumero = context.Request.Form["OrigemNumero"].ToString();
                var produto = context.Request.Form["produto"].ToString();
                var codigoUsuarioCancelamento = context.Request.Form["codigoUsuarioCancelamento"].ToString();
                var DataCancelamento = context.Request.Form["DataCancelamento"].ToString();
                var MotivoCancelamento = context.Request.Form["MotivoCancelamento"].ToString();
                
               /* if (string.IsNullOrEmpty(IDCARGA))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDPEDIDO não fornecido.\"}");
                    return;
                }*/
                var query = $"update startapp..Pedidoscarga " +
                $"set " +
                $"TITULOCARGA =  '{  TITULOCARGA }', " +
                $"CAPACIDADE =  '{  CAPACIDADE }'," +
                $"  COMENTARIO =  '{  COMENTARIO }'," +
                $"  IDCLIENTE =  '{  IDCLIENTE }'," +
                $"  NOMECLIENTE =  '{  NOMECLIENTE }'," +
                $"  CARREGAMENTO =  '{  CARREGAMENTO }'," +
                $"  AGENDA =  '{  AGENDA }'," +
                $"  SITUACAO =  '{  SITUACAO }'," +
                $"  PESOKG =  replace(replace('{PESOKG}','.',''),',','.')," +
                $"  VALORFRETE =  replace(replace('{  VALORFRETE }','.',''),',','.')," +
                $"  ADIANTAMENTO =  '{  ADIANTAMENTO }'," +
                $"  OBSERVACOES =  '{  OBSERVACOES }', " +
                $"  OrigemUF =  '{  OrigemUF }'," +
                $"  OrigemCidade =  '{  OrigemCidade }'," +
                $"  OrigemCEP =  '{  OrigemCEP }'," +
                $"  OrigemEndereco =  '{  OrigemEndereco }'," +
                $"  OrigemNumero =  '{  OrigemNumero }'," +
                $"  produto =  '{  produto }'," +
                $"  codigoUsuarioCancelamento =  '{  codigoUsuarioCancelamento }'," +
                $"  DataCancelamento =  '{  DataCancelamento }'," +
                $"  MotivoCancelamento =  '{  MotivoCancelamento }' " +
                $"Where id = { IDCARGA }";

                await ExecSQLQuery(query, context);
            });

            //Gravar Data e Hora
            app.MapPost("/GravaDataHora", async context =>
            {
                var CodigoUsuario = context.Request.Form["CodigoUsuario"].ToString();
                var CodigoMotorista = context.Request.Form["CodigoMotorista"].ToString();
                var TipoEvento = context.Request.Form["TipoEvento"].ToString(); //Exemplo InicioEntrega ou FimEntreg
                var Chave = context.Request.Form["Chave"].ToString();


                var query = $"exec startapp_magicroute..GravaDataEvento '{CodigoUsuario}', '{CodigoMotorista}', '{TipoEvento}', '{Chave}'";

                await ExecSQLQuery(query, context);
            });


                //Insere Destinos
                app.MapPost("/AdicionarDestinoPedido", async context =>
            {
                var IDPEDIDO = context.Request.Form["IDPEDIDO"].ToString();
                var PESO = context.Request.Form["PESO"].ToString();
                var VOLUME = context.Request.Form["VOLUME"].ToString();
                var DESTINOUF = context.Request.Form["DESTINOUF"].ToString();
                var DESTINOCIDADE = context.Request.Form["DESTINOCIDADE"].ToString();
                var DESTINOCEP = context.Request.Form["DESTINOCEP"].ToString();
                var DESTINOENDERECO = context.Request.Form["DESTINOENDERECO"].ToString();
                var DESTINONUMERO = context.Request.Form["DESTINONUMERO"].ToString();
                var DataEntrega = context.Request.Form["DataEntrega"].ToString();

                if (string.IsNullOrEmpty(IDPEDIDO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDPEDIDO não fornecido.\"}");
                    return;
                }

                var query = $"INSERT INTO startapp..PedidosCargaDestinos VALUES(" +
                $" {IDPEDIDO}" +
                $", isnull((Select max(sequencia) from startapp..PedidosCargaDestinos where idpedido = {IDPEDIDO} ),0) + 1" +
                $", {PESO}" +
                $", '{VOLUME}'" +
                $", '{DESTINOUF}'" +
                $", '{DESTINOCIDADE}'" +
                $", '{DESTINOCEP}'" +
                $", '{DESTINOENDERECO}'" +
                $", '{DESTINONUMERO}'" +
                $", '{DataEntrega}'" +
                $")";
                await ExecSQLQuery(query, context);
            });
            app.MapGet("/PedidoDestinos", async context =>
            {
                var ID = context.Request.Query["ID"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }

                var query = $"Select * from startapp..PedidosCargaDestinos where idpedido = {ID}";
                await ExecSQLQuery(query, context);
            });
            app.MapDelete("/PedidoDestinos", async context =>
            {
                var IDPEDIDO = context.Request.Query["IDPEDIDO"].ToString();
                if (string.IsNullOrEmpty(IDPEDIDO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDPEDIDO não fornecido.\"}");
                    return;
                }
                var Sequencia = context.Request.Query["Sequencia"].ToString();
                if (string.IsNullOrEmpty(Sequencia))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro Sequencia não fornecido.\"}");
                    return;
                }

                var query = $"Delete from startapp..PedidosCargaDestinos where IDPEDIDO = {IDPEDIDO} and Sequencia = {Sequencia}";
                await ExecSQLQuery(query, context);
            });


            //Exigencias
            app.MapPost("/CadastroExigencia", async context =>
            {
                var Exigencia = context.Request.Form["Exigencia"].ToString();
                if (string.IsNullOrEmpty(Exigencia))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }

                var query = $"insert into startapp..exigencias" +
                            $" values(isnull((Select max(ID) from startapp..exigencias), 0) + 1,'{Exigencia}','Ativo')";
                await ExecSQLQuery(query, context);
            });

            app.MapGet("/Exigencias", async context =>
            {
                

                var query = $"Select * from startapp..exigencias ";
                await ExecSQLQuery(query, context);
            });
            
            app.MapGet("/PedidoExigencia", async context =>
            {
                var ID = context.Request.Query["ID"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }

                var query = $"Select * from startapp..PedidosCargaExigencia where idpedido = {ID}";
                await ExecSQLQuery(query, context);
            });
            app.MapGet("/PedidoExigenciaSelecionaveis", async context =>
            {
                var ID = context.Request.Query["ID"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }

                var query = $"Select ex.ID,ex.EXIGENCIA from startapp..exigencias ex " +
                            $"left join startapp..PedidosCargaExigencia pe on ex.ID = pe.idexigencia and idpedido = {ID} " +
                            $"where pe.idpedido is null";
                await ExecSQLQuery(query, context);
            });
            app.MapPost("/AdiconarExigenciaPedido", async context =>
            {
                var IDPEDIDO = context.Request.Form["IDPEDIDO"].ToString();
                if (string.IsNullOrEmpty(IDPEDIDO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDPEDIDO não fornecido.\"}");
                    return;
                }
                var IDEXIGENCIA = context.Request.Form["IDEXIGENCIA"].ToString();
                if (string.IsNullOrEmpty(IDEXIGENCIA))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDEXIGENCIA não fornecido.\"}");
                    return;
                }

                var query = $"insert into startapp..PedidosCargaExigencia (IDPEDIDO,IDEXIGENCIA,EXIGENCIA) Values({IDPEDIDO},{IDEXIGENCIA},(Select Exigencia from startapp..exigencias where id = {IDEXIGENCIA}))";
                await ExecSQLQuery(query, context);
            });
            app.MapDelete("/PedidoExigencia", async context =>
            {
                var IDPEDIDO = context.Request.Query["IDPEDIDO"].ToString();
                if (string.IsNullOrEmpty(IDPEDIDO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDPEDIDO não fornecido.\"}");
                    return;
                }
                var IDEXIGENCIA = context.Request.Query["IDEXIGENCIA"].ToString();
                if (string.IsNullOrEmpty(IDEXIGENCIA))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDEXIGENCIA não fornecido.\"}");
                    return;
                }

                var query = $"Delete from startapp..PedidosCargaExigencia where IDPEDIDO = {IDPEDIDO} and IDEXIGENCIA = {IDEXIGENCIA}";
                await ExecSQLQuery(query, context);
            });

            //Trucks
            app.MapPost("/CadastroTiposTruck", async context =>
            {
                var TipoTruck = context.Request.Form["TipoTruck"].ToString();
                if (string.IsNullOrEmpty(TipoTruck))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro TipoTruck não fornecido.\"}");
                    return;
                }

                var query = $"insert into startapp..TiposTruck" +
                            $" values(isnull((Select max(ID) from startapp..TiposTruck), 0) + 1,'{TipoTruck}','Ativo')";

                
                await ExecSQLQuery(query, context);
            });

            app.MapGet("/TiposTruck", async context =>
            {
                var query = $"Select * from startapp..TiposTruck ";
                await ExecSQLQuery(query, context);
            });

            app.MapGet("/PedidoTrucks", async context =>
            {
                var ID = context.Request.Query["ID"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }

                var query = $"Select * from startapp..PedidosCargaTrucks where idpedido = {ID}";
                await ExecSQLQuery(query, context);
            });
            app.MapGet("/PedidoTrucksSelecionaveis", async context =>
            {
                var ID = context.Request.Query["ID"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }

                var query = $"Select ex.ID,ex.tipo from startapp..TiposTruck ex " +
                            $"left join startapp..PedidosCargaTrucks pe on ex.ID = pe.idtipo and idpedido = {ID} " +
                            $"where pe.idpedido is null";
                await ExecSQLQuery(query, context);
            });
            app.MapPost("/AdiconarTrucksPedido", async context =>
            {
                var IDPEDIDO = context.Request.Form["IDPEDIDO"].ToString();
                if (string.IsNullOrEmpty(IDPEDIDO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDPEDIDO não fornecido.\"}");
                    return;
                }
                var IDTIPO = context.Request.Form["IDTIPO"].ToString();
                if (string.IsNullOrEmpty(IDTIPO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDEXIGENCIA não fornecido.\"}");
                    return;
                }

                var query = $"insert into startapp..PedidosCargaTrucks (IDPEDIDO,IDTIPO,TIPO) Values({IDPEDIDO},{IDTIPO},(Select Tipo from startapp..TiposTruck where id = {IDTIPO}))";
                await ExecSQLQuery(query, context);
            });
            app.MapDelete("/PedidoTrucks", async context =>
            {
                var IDPEDIDO = context.Request.Query["IDPEDIDO"].ToString();
                if (string.IsNullOrEmpty(IDPEDIDO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDPEDIDO não fornecido.\"}");
                    return;
                }
                var IDTIPO = context.Request.Query["IDTIPO"].ToString();
                if (string.IsNullOrEmpty(IDTIPO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDTIPO não fornecido.\"}");
                    return;
                }

                var query = $"Delete from startapp..PedidosCargaTrucks where IDPEDIDO = {IDPEDIDO} and IDTIPO = {IDTIPO}";
                await ExecSQLQuery(query, context);
            });
            //Veiculos
            app.MapPost("/CadastroTiposVeiculos", async context =>
            {
                var TipoVeiculo = context.Request.Form["TipoVeiculo"].ToString();
                if (string.IsNullOrEmpty(TipoVeiculo))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro TipoVeiculo não fornecido.\"}");
                    return;
                }

                var query = $"insert into startapp..TipoVeiculos" +
                            $" values(isnull((Select max(ID) from startapp..TipoVeiculos), 0) + 1,'{TipoVeiculo}','Ativo')";


                await ExecSQLQuery(query, context);
            });

            app.MapGet("/TiposVeiculos", async context =>
            {
                var query = $"Select * from startapp..TipoVeiculos ";
                await ExecSQLQuery(query, context);
            });

            app.MapGet("/PedidoVeiculos", async context =>
            {
                var ID = context.Request.Query["ID"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }

                var query = $"Select * from startapp..PedidosCargaVeiculos where idpedido = {ID}";
                await ExecSQLQuery(query, context);
            });
            app.MapGet("/PedidoVeiculosSelecionaveis", async context =>
            {
                var ID = context.Request.Query["ID"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }

                var query = $"Select ex.id,ex.tipo from startapp..TipoVeiculos ex " +
                            $"left join startapp..PedidosCargaVeiculos pe on ex.ID = pe.idtipo and idpedido = {ID} " +
                            $"where pe.idpedido is null";
                await ExecSQLQuery(query, context);
            });
            app.MapPost("/AdiconarVeiculosPedido", async context =>
            {
                var IDPEDIDO = context.Request.Form["IDPEDIDO"].ToString();
                if (string.IsNullOrEmpty(IDPEDIDO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDPEDIDO não fornecido.\"}");
                    return;
                }
                var IDTIPO = context.Request.Form["IDTIPO"].ToString();
                if (string.IsNullOrEmpty(IDTIPO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDTIPO não fornecido.\"}");
                    return;
                }

                var query = $"insert into startapp..PedidosCargaVeiculos (IDPEDIDO,IDTIPO,TIPO) Values({IDPEDIDO},{IDTIPO},(Select Tipo from startapp..TipoVeiculos where id = {IDTIPO}))";
                await ExecSQLQuery(query, context);
            });
            app.MapDelete("/PedidoVeiculos", async context =>
            {
                var IDPEDIDO = context.Request.Query["IDPEDIDO"].ToString();
                if (string.IsNullOrEmpty(IDPEDIDO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDPEDIDO não fornecido.\"}");
                    return;
                }
                var IDTIPO = context.Request.Query["IDTIPO"].ToString();
                if (string.IsNullOrEmpty(IDTIPO))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IDTIPO não fornecido.\"}");
                    return;
                }

                var query = $"Delete from startapp..PedidosCargaVeiculos where IDPEDIDO = {IDPEDIDO} and IDTIPO = {IDTIPO}";
                await ExecSQLQuery(query, context);
            });


            //RetornaMensagensCarga
            app.MapGet("/CargaMensagens", async context =>
            {
                var ID = context.Request.Query["ID"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }

                var query = $"Select " +
                            $"NomeContato,TelefoneContato " +
                            $",(Select w2.Mensagem from startapp..WhatsAppFila W2 where w2.Sequencia = max(w.Sequencia)) UltimaMensagem " +
                            $",(Select w2.Situacao from startapp..WhatsAppFila W2 where w2.Sequencia = max(w.Sequencia)) Situacao " +
                            $"from startapp..WhatsAppFila W " +
                            $"where Chave = {ID} " +
                            $"group by NomeContato,TelefoneContato";
                await ExecSQLQueryJson(query, context);
            });

            //RetornaMensagensCargaRespondidas
            app.MapGet("/CargaMensagensRespondidas", async context =>
            {
                var ID = context.Request.Query["ID"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }

                var query = $"Select " +
                            $"NomeContato,TelefoneContato " +
                            $",(Select w2.Mensagem from startapp..WhatsAppFila W2 where w2.Sequencia = max(w.Sequencia)) UltimaMensagem " +
                            $",(Select w2.Situacao from startapp..WhatsAppFila W2 where w2.Sequencia = max(w.Sequencia)) Situacao " +
                            $"from startapp..WhatsAppFila W " +
                            $"where Chave = {ID} " +
                            $"group by NomeContato,TelefoneContato " +
                            $"having (SELECT count(W2.Sequencia) FROM startapp..WhatsAppFila W2 WHERE W2.Chave = MAX(W.chave) and TelefoneContato = w.TelefoneContato  and w2.Situacao = 'Recebida')  >= 1"
                            ;
                await ExecSQLQueryJson(query, context);
            });

            //RetornaMensagensCargaContato
            app.MapGet("/CargaMensagensChat", async context =>
            {
                var ID = context.Request.Query["ID"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro ID não fornecido.\"}");
                    return;
                }
                var Telefone = context.Request.Query["Telefone"].ToString();
                if (string.IsNullOrEmpty(ID))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro Telefone não fornecido.\"}");
                    return;
                }

                var query = $"Select " +
                $"NomeContato " +
                $",TelefoneContato " +
                $",Mensagem " +
                $",Situacao " +
                $",DataLancamento " +
                $",cast(HoraLancamento as varchar(5))as HoraMinutos " +
                $"from startapp..WhatsAppFila W " +
                $"where Chave = {ID} and TelefoneContato = '{Telefone}' " +
                $"order by Sequencia";
                await ExecSQLQueryJson(query, context);
            });

            //DisparaMensagemCarga
            app.MapPost("/DisparaCargaDisponivel", async context =>
            {
                var IDCARGA = context.Request.Form["ID"].ToString();
                

                var query = $" exec startapp..DisparaCargaDisponivel {IDCARGA}";

                await ExecSQLQuery(query, context);
            });



            //Fim App CiaCargas

            // Aplicativo de Rotas
            // Empresa IP
            app.MapGet("/empresa", async context =>
            {
                var cnpj = context.Request.Query["cnpj"].ToString().Replace("'", "''");
                if (string.IsNullOrEmpty(cnpj))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro CNPJ não fornecido.\"}");
                    return;
                }

                var query = $"SELECT * FROM apps..Empresas WHERE cnpj = replace(replace(replace(cast('{cnpj}' as Varchar(100)),'.',''),'/',''),'-','')";
                await ExecSQLQuery(query, context);
            });

            // Login Motorista
            app.MapGet("/LoginMotorista", async context =>
            {
                var bd = context.Request.Query["bd"].ToString().Replace("'", "''");
                var CodigoMotorista = context.Request.Query["CodigoMotorista"].ToString().Replace("'", "''");
                var SenhaMotorista = context.Request.Query["SenhaMotorista"].ToString().Replace("'", "''");

                if (string.IsNullOrEmpty(bd))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro bd não fornecido.\"}");
                    return;
                }
                if (string.IsNullOrEmpty(CodigoMotorista))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro CodigoMotorista não fornecido.\"}");
                    return;
                }
                if (string.IsNullOrEmpty(SenhaMotorista))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro SenhaMotorista não fornecido.\"}");
                    return;
                }

                var query = $"Select CODIGOMOTORISTA as Codigo,SenhaMotorista as Senha,nome as Motorista from {bd}..motoristas Where CODIGOMOTORISTA = {CodigoMotorista} and SenhaMotorista = {SenhaMotorista}";
                await ExecSQLQuery(query, context);
            });

            // Busca lotes por Data
            app.MapGet("/Lotes", async context =>
            {
                var bd = context.Request.Query["bd"].ToString().Replace("'", "''");
                var CodigoMotorista = context.Request.Query["CodigoMotorista"].ToString().Replace("'", "''");
                var DataEntrega = context.Request.Query["DataEntrega"].ToString().Replace("'", "''");

                if (string.IsNullOrEmpty(bd))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro bd não fornecido.\"}");
                    return;
                }
                if (string.IsNullOrEmpty(CodigoMotorista))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro CodigoMotorista não fornecido.\"}");
                    return;
                }
                if (string.IsNullOrEmpty(DataEntrega))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro DataEntrega não fornecido.\"}");
                    return;
                }

                var query = $@"Select 
                    idlote
                    ,sai.Nome as NomeLocal
                    ,sai.horariosaida
                    ,vei.veiculo
                    ,vei.urlfoto
                    ,vei.placa
                    ,DataEntrega
                    ,count(IDENTREGA) as QuantidadeEntregas
                    ,sum(Peso) as Peso
                    ,(Select Count(IDENTREGA) from {bd}..Entregas ent where ent.idlote = lote.idlote and situacaoentrega = 'Pendente' and ent.codigomotorista = lote.codigomotorista) as Pendentes
                    ,(Select Count(IDENTREGA) from {bd}..Entregas ent where ent.idlote = lote.idlote and situacaoentrega = 'Entregue' and ent.codigomotorista = lote.codigomotorista) as Entregues
                    ,(Select Count(IDENTREGA) from {bd}..Entregas ent where ent.idlote = lote.idlote and situacaoentrega = 'Não Entregue' and ent.codigomotorista = lote.codigomotorista) as [Não Entregues]
                    from {bd}..entregas Lote
                    left join {bd}..LocalSaidas sai
                    on sai.idlocal = lote.idlocalsaida
                    left join {bd}..veiculos vei
                    on vei.codigoveiculo = lote.codigoveiculo
                    where codigomotorista = {CodigoMotorista} and (Select Count(IDENTREGA) from {bd}..Entregas ent where ent.idlote = lote.idlote and situacaoentrega = 'Pendente' and ent.codigomotorista = lote.codigomotorista) > 0 and dataentrega = cast('{DataEntrega}' as date)
                    group by idlote,codigomotorista,dataentrega,idlocalsaida,sai.nome,vei.veiculo,vei.urlfoto,vei.placa,sai.horariosaida";

                await ExecSQLQuery(query, context);
            });

            // Busca Entregas Pendentes do Lote
            app.MapGet("/EntregasPendentes", async context =>
            {
                var bd = context.Request.Query["bd"].ToString().Replace("'", "''");
                var IdLote = context.Request.Query["IdLote"].ToString().Replace("'", "''");

                if (string.IsNullOrEmpty(bd))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro bd não fornecido.\"}");
                    return;
                }
                if (string.IsNullOrEmpty(IdLote))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    await context.Response.WriteAsync("{\"message\":\"Parâmetro IdLote não fornecido.\"}");
                    return;
                }

                var query = $"Select * from {bd}..Entregas Where IDLOTE = {IdLote} and situacaoentrega = 'Pendente' order by sequenciaforcada,sequencia asc";
                await ExecSQLQuery(query, context);
            });

            app.MapDelete("/clientes/{CodigoCliente}", async context =>
            {
                var codigoCliente = context.Request.RouteValues["CodigoCliente"].ToString().Replace("'", "''");
                await ExecSQLQuery($"DELETE FROM Clientes WHERE CodigoCliente = {codigoCliente}", context);
            });

            app.MapPost("/clientes", async context =>
            {
                var id = context.Request.Form["id"].ToString().Replace("'", "''");
                var nome = context.Request.Form["nome"].ToString().Replace("'", "''");
                var cpf = context.Request.Form["cpf"].ToString().Replace("'", "''");
                var query = $"INSERT INTO tid_temp.dbo.testeapi (codigo, Nome, cnpj) VALUES({id},'{nome}','{cpf}')";
                await ExecSQLQuery(query, context);
            });

            app.MapMethods("/clientes/{id}", new[] { "PATCH" }, async context =>
            {
                var id = context.Request.RouteValues["id"].ToString().Replace("'", "''");
                var nome = context.Request.Form["nome"].ToString().Replace("'", "''");
                var cpf = context.Request.Form["cpf"].ToString().Replace("'", "''");
                var query = $"UPDATE tid_temp.dbo.testeapi SET Nome='{nome}', CNPJ='{cpf}' WHERE Codigo = {id}";
                await ExecSQLQuery(query, context);
            });

            app.MapPost("/webhookMensagens", async context =>
            {
                using (var reader = new StreamReader(context.Request.Body))
                {
                    var webhookData = await reader.ReadToEndAsync();
                    var query = $"INSERT INTO startapp..WebHook values ('{webhookData.Replace("'", "''")}')";
                    await ExecSQLQuery(query, context);
                }
            });
           


            app.Use(async (context, next) =>
            {
                var path = context.Request.Path.Value?.ToLower();

                // 🔓 Libera Swagger e favicon
                if (path.Contains("/swagger") || path.Contains("/favicon"))
                {
                    await next();
                    return;
                }

                const string API_KEY_HEADER = "x-api-key";

                // 🔒 1. Verifica se veio a API Key
                if (!context.Request.Headers.TryGetValue(API_KEY_HEADER, out var chaveRecebida))
                {
                    context.Response.StatusCode = 401;
                    context.Response.ContentType = "application/json; charset=utf-8";
                    await context.Response.WriteAsync("{\"mensagem\": \"Chave de API não informada.\"}");
                    return;
                }

                // 🔒 2. Verifica se veio o parâmetro IdEmpresa (query ou form)
                
               /* string idEmpresaStr = context.Request.Query["IdEmpresa"];
                if (string.IsNullOrEmpty(idEmpresaStr))
                {
                    if (context.Request.HasFormContentType)
                        idEmpresaStr = context.Request.Form["IdEmpresa"];
                }

                if (!int.TryParse(idEmpresaStr, out int idEmpresa) || idEmpresa <= 0)
                {
                    context.Response.StatusCode = 400;
                    context.Response.ContentType = "application/json; charset=utf-8";
                    await context.Response.WriteAsync("{\"mensagem\": \"Parâmetro 'IdEmpresa' não informado ou inválido.\"}");
                    return;
                }

                // 🔒 3. Valida no banco se essa chave pertence à empresa
                var apiKeyService = context.RequestServices.GetRequiredService<APISQL_SERVER.Services.ApiKeyService>();
                var valida = await apiKeyService.ValidarApiKeyAsync( chaveRecebida!);

                if (!valida)
                {
                    context.Response.StatusCode = 401;
                    context.Response.ContentType = "application/json; charset=utf-8";
                    await context.Response.WriteAsync("{\"mensagem\": \"API Key não pertence à empresa informada.\"}");
                    return;
                }
               */
                // ✅ Tudo certo → segue o fluxo
                await next();
            });





            app.UseHttpsRedirection();
            app.UseAuthorization();
            app.MapControllers(); 
            app.UseRequestLocalization(localizationOptions);

            app.Run();
        }

        
        static async System.Threading.Tasks.Task ExecSQLQuery(string sqlQuery, HttpContext context)
        {
            try
            {
                using (var connection = new SqlConnection("Data Source=localhost\\startapp;Initial Catalog=master;User Id=sa;Password=cia@2023;"))
                {
                    await connection.OpenAsync();
                    using (var command = new SqlCommand(sqlQuery, connection))
                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        var result = new StringWriter();
                        result.Write("[");

                        var first = true;
                        while (await reader.ReadAsync())
                        {
                            if (!first) result.Write(",");
                            first = false;

                            result.Write("{");
                            for (var i = 0; i < reader.FieldCount; i++)
                            {
                                if (i > 0) result.Write(",");
                                result.Write($"\"{reader.GetName(i)}\":\"{reader.GetValue(i)}\"");
                            }
                            result.Write("}");
                        }

                        result.Write("]");
                        context.Response.ContentType = "application/json; charset=utf-8";
                        var responseString = result.ToString();
                        
                        await context.Response.WriteAsync(responseString, Encoding.UTF8);
                    }
                }
            }
            catch (Exception ex)
            {
                // Adicionar logs de erro com a query SQL que causou o erro
                Console.WriteLine($"Erro na execução da consulta SQL: {ex.Message}");
                Console.WriteLine($"Query: {sqlQuery}");
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                await context.Response.WriteAsync($"{{\"error\":\"{ex.Message}\", \"query\":\"{sqlQuery.Replace("\"", "\\\"")}\"}}");
            }
        }

        //Formata Json Automaticamente
        static async System.Threading.Tasks.Task ExecSQLQueryJson(string sqlQuery, HttpContext context)
        {
            try
            {
                using (var connection = new SqlConnection("Data Source=localhost\\startapp;Initial Catalog=master;User Id=sa;Password=cia@2023;"))
                {
                    await connection.OpenAsync();
                    using (var command = new SqlCommand(sqlQuery, connection))
                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        var result = new List<Dictionary<string, object>>();

                        while (await reader.ReadAsync())
                        {
                            var row = new Dictionary<string, object>();
                            for (var i = 0; i < reader.FieldCount; i++)
                            {
                                row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                            }
                            result.Add(row);
                        }

                        context.Response.ContentType = "application/json; charset=utf-8";
                        var responseString = JsonSerializer.Serialize(result);
                        await context.Response.WriteAsync(responseString, Encoding.UTF8);
                    }
                }
            }
            catch (Exception ex)
            {
                // Adicionar logs de erro com a query SQL que causou o erro
                Console.WriteLine($"Erro na execução da consulta SQL: {ex.Message}");
                Console.WriteLine($"Query: {sqlQuery}");
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                await context.Response.WriteAsync($"{{\"error\":\"{ex.Message}\", \"query\":\"{sqlQuery.Replace("\"", "\\\"")}\"}}");
            }
        }
    }
}
