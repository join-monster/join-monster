
module.exports = function dbCall(sql, bindings, knex, context) {
  console.log(sql, bindings)
  if (context) {
    context.set('X-SQL-Preview', context.response.get('X-SQL-Preview') + '%0A%0A' + sql.replace(/%/g, '%25').replace(/\n/g, '%0A'))
  }
  return knex.raw(sql, bindings).then(result => {
    if (knex.client.config.client === 'mysql') {
      return result[0]
    }
    return result
  })
}

