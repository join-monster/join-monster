module.exports = function dbCall(sql, knex, context) {
  if (context?.res) {
    context.res.set(
      'X-SQL-Preview',
      sql.replace(/%/g, '%25').replace(/\n/g, '%0A')
    )
  }
  return knex.raw(sql).then(result => {
    if (knex.client.config.client === 'mysql') {
      return result[0]
    }
    return result
  })
}
