const sql = require('mssql');

const sqlConfig = {
  user: 'sa',
  password: 'tid@125632',
  server: 'localhost',
  database: 'startapp_magicroute',
  options: {
    instanceName: 'TIDSCI_2022',
    encrypt: false,
    trustServerCertificate: true,
  }
};

async function test() {
  try {
    await sql.connect(sqlConfig);
    console.log('Alterando a função DadosDashBoard no SQL Server...');
    await sql.query(`
      ALTER Function DadosDashBoard (@IdEmpresa int )
      returns table
      as
      Return
      (
      Select 
        count(distinct le.NumeroPedido) EntregasMes
        ,count(case when le.StatusEntrega = 'Pendente' then le.NumeroPedido end) EntregasEmAbertas
        ,count(distinct l.IDLote) Lotes
        ,count(distinct case when l.Situacao = 'Em Aberto' then l.idlote end) RotasEmAberta
        ,count(case when TRY_CONVERT(DATE, le.DataEntrega, 103) = cast(getdate() as date) then le.NumeroPedido end) EntregasDia
        ,count(case when TRY_CONVERT(DATE, le.DataEntrega, 103) = cast(getdate() as date) and le.StatusEntrega IN ('Finalizada', 'Entregue') then le.NumeroPedido end) EntregasFinalizadasDia
        ,count(distinct case when TRY_CONVERT(DATE, le.DataEntrega, 103) = cast(getdate() as date) then le.IDLote end) RotasDia
        ,count(case when TRY_CONVERT(DATE, le.DataEntrega, 103) = cast(getdate() as date) and l.Situacao IN ('Concluido', 'Concluído', 'Entregue') then le.NumeroPedido end) RotasFinalizadasDia
        ,iif(count(case when TRY_CONVERT(DATE, le.DataEntrega, 103) = cast(getdate() as date) then le.NumeroPedido end) > 0
            ,cast(isnull(count(case when TRY_CONVERT(DATE, le.DataEntrega, 103) = cast(getdate() as date) and le.StatusEntrega IN ('Finalizada', 'Entregue') then le.NumeroPedido end), 1) as float) / count(case when TRY_CONVERT(DATE, le.DataEntrega, 103) = cast(getdate() as date) then le.NumeroPedido end) 
            ,0
          ) PercentEntregasDia
        ,iif(count(distinct case when TRY_CONVERT(DATE, le.DataEntrega, 103) = cast(getdate() as date) then le.IDLote end) > 0
            ,cast(isnull(count(case when TRY_CONVERT(DATE, le.DataEntrega, 103) = cast(getdate() as date) and l.Situacao IN ('Concluido', 'Concluído', 'Entregue') then le.NumeroPedido end), 1) as float) / count(distinct case when TRY_CONVERT(DATE, le.DataEntrega, 103) = cast(getdate() as date) then le.IDLote end) 
            ,0
          ) PercentRotasDia
      from startapp_magicroute..LotesEntregas LE

      inner join startapp_magicroute..Lotes L
      on l.IDLote = le.IDLote and l.IDEmpresa = le.IDEmpresa

      left join startapp_magicroute..Locais Loc
      on loc.CodigoLocal = l.CodigoLocalSaida and loc.IDEmpresa = l.IDEmpresa

      left join startapp_magicroute..veiculos vei
      on vei.codigoveiculo = l.CodigoVeiculo

      where MONTH(TRY_CONVERT(DATE, le.DataEntrega, 103)) = MONTH(getdate()) 
        and YEAR(TRY_CONVERT(DATE, le.DataEntrega, 103)) = YEAR(getdate()) 
        and le.IDEmpresa = @IdEmpresa
      )
    `);
    console.log('Função DadosDashBoard alterada com sucesso!');
    await sql.close();
  } catch (err) {
    console.error(err);
  }
}

test();
