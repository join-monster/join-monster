'use strict';

function throwErr() {
  throw new Error('This type of pagination not supported on this dialect');
}

module.exports = {
  handlePaginationAtRoot: throwErr,
  handleJoinedOneToManyPaginated: throwErr,
  handleBatchedOneToManyPaginated: throwErr,
  handleJoinedManyToManyPaginated: throwErr,
  handleBatchedManyToManyPaginated: throwErr
};