import {graphql} from 'graphql';
import schemaRelay from '../../test-api/schema-paginated/index';
import {partial} from 'lodash';
import {offsetToCursor, toGlobalId, fromGlobalId} from 'graphql-relay';
import {errCheck} from '../helpers/_util';

// monkey-patch the array prototype because these are tests and IDGAF
Object.defineProperty(Array.prototype, 'last', {
  value: function() {
    return this[this.length - 1];
  },
  enumberable: false,
});

const run = partial(graphql, schemaRelay);

function stringifyArgs(args) {
  if (!args) {
    return '';
  }
  const argArr = [];
  for (let name in args) {
    argArr.push(`${name}: ${JSON.stringify(args[name])}`);
  }
  return `(${argArr.join(', ')})`;
}

const pageInfo = 'pageInfo { hasNextPage, startCursor, endCursor }';

function makeUsersQuery(args) {
  let argString = stringifyArgs(args);
  return `{
    users${argString} {
      total
      ${pageInfo}
      edges {
        cursor
        node { id, fullName, email }
      }
    }
  }`;
}

test('should handle pagination at the root', async () => {
  const query = makeUsersQuery();
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.pageInfo).toEqual({
    hasNextPage: false,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(5),
  });
  expect(data.users.edges[0]).toEqual({
    cursor: offsetToCursor(0),
    node: {
      id: toGlobalId('User', 1),
      fullName: 'Alivia Waelchi',
      email: 'Mohammed.Hayes@hotmail.com',
    },
  });
  expect(data.users.edges.last().cursor).toBe(data.users.pageInfo.endCursor);
});

test('should handle root pagination with "first" arg', async () => {
  const query = makeUsersQuery({first: 2});
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.pageInfo).toEqual({
    hasNextPage: true,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(1),
  });
  expect(data.users.edges[0]).toEqual({
    cursor: offsetToCursor(0),
    node: {
      id: toGlobalId('User', 1),
      fullName: 'Alivia Waelchi',
      email: 'Mohammed.Hayes@hotmail.com',
    },
  });
  expect(data.users.edges.last().cursor).toBe(data.users.pageInfo.endCursor);
});

test('should handle root pagination with "first" and "after" args', async () => {
  const query = makeUsersQuery({first: 2, after: offsetToCursor(1)});
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.pageInfo).toEqual({
    hasNextPage: true,
    startCursor: offsetToCursor(2),
    endCursor: offsetToCursor(3),
  });
  expect(data.users.edges[0]).toEqual({
    cursor: offsetToCursor(2),
    node: {
      id: toGlobalId('User', 3),
      fullName: 'Coleman Abernathy',
      email: 'Lurline79@gmail.com',
    },
  });
  expect(data.users.edges.last().cursor).toBe(data.users.pageInfo.endCursor);
});

test('should handle the last page of root pagination', async () => {
  const query = makeUsersQuery({first: 2, after: offsetToCursor(4)});
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.pageInfo).toEqual({
    hasNextPage: false,
    startCursor: offsetToCursor(5),
    endCursor: offsetToCursor(5),
  });
  expect(data.users.edges.length).toBe(1);
  expect(data.users.edges[0]).toEqual({
    cursor: offsetToCursor(5),
    node: {
      id: toGlobalId('User', 6),
      fullName: 'Andrew Carlson',
      email: 'andrew@stem.is',
    },
  });
  expect(data.users.edges.last().cursor).toBe(data.users.pageInfo.endCursor);
});

test('should return nothing after the end of root pagination', async () => {
  const query = makeUsersQuery({first: 3, after: offsetToCursor(5)});
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users).toEqual({
    total: 0,
    pageInfo: {
      hasNextPage: false,
      startCursor: null,
      endCursor: null,
    },
    edges: [],
  });
});

function makePostsQuery(args) {
  let argString = stringifyArgs(args);
  return `{
    user(id: 1) {
      posts${argString} {
        total
        ${pageInfo}
        edges {
          cursor
          node { id, body }
        }
      }
    }
  }`;
}

test('should handle pagination in a nested field', async () => {
  const query = makePostsQuery();
  const {data, errors} = await run(query);
  errCheck(errors);
  const posts = data.user.posts;
  expect(posts.total).toBe(8);
  expect(posts.pageInfo).toEqual({
    hasNextPage: false,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(7),
  });
  expect(posts.edges.length).toBe(8);
  expect(posts.edges[0]).toEqual({
    cursor: offsetToCursor(0),
    node: {
      id: toGlobalId('Post', 2),
      body: [
        'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
        'Deserunt nemo pariatur sed facere accusantium quis.',
        'Nobis aut voluptate inventore quidem explicabo.',
      ].join(' '),
    },
  });
  expect(posts.edges.last().cursor).toBe(posts.pageInfo.endCursor);
});

test('nested paging should handle "first" arg', async () => {
  const query = makePostsQuery({first: 3});
  const {data, errors} = await run(query);
  errCheck(errors);
  const posts = data.user.posts;
  expect(posts.total).toBe(8);
  expect(posts.pageInfo).toEqual({
    hasNextPage: true,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(2),
  });
  expect(posts.edges.length).toBe(3);
  expect(posts.edges.last().cursor).toBe(posts.pageInfo.endCursor);
});

test('nested paging should handle "first" and "after" args that reaches the last page', async () => {
  const query = makePostsQuery({first: 5, after: offsetToCursor(3)});
  const {data, errors} = await run(query);
  errCheck(errors);
  const posts = data.user.posts;
  expect(posts.total).toBe(8);
  expect(posts.pageInfo).toEqual({
    hasNextPage: false,
    startCursor: offsetToCursor(4),
    endCursor: offsetToCursor(7),
  });
  expect(posts.edges.length).toBe(4);
  expect(posts.edges.last().cursor).toBe(posts.pageInfo.endCursor);
});

test('can handle nested pagination', async () => {
  const query = `{
    users(first: 2) {
      edges {
        node {
          fullName,
          posts(first: 2) {
            total
            edges {
              node { body }
            }
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  expect(data.users.edges.map((edge) => edge.node.posts.total)).toEqual([
    8,
    13,
  ]);
  errCheck(errors);
  expect(data.users.edges.length).toBe(2);
  expect(data.users.edges[0].node.fullName).toBe('Alivia Waelchi');
  expect(data.users.edges[0].node.posts.edges.length).toBe(2);
  expect(data.users.edges[0].node.posts.edges[0].node.body).toBe(
    [
      'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
      'Deserunt nemo pariatur sed facere accusantium quis.',
      'Nobis aut voluptate inventore quidem explicabo.',
    ].join(' ')
  );
});

test('can go to each second page in a nested connection', async () => {
  const query = `{
    users(first: 2) {
      edges {
        node {
          id
          fullName
          posts(first: 2, after: "${offsetToCursor(1)}") {
            edges {
              cursor
              node { id, body }
            }
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.edges[0].node.id).toBe(toGlobalId('User', 1));
  expect(
    data.users.edges[0].node.posts.edges.map((edge) => edge.node.id)
  ).toEqual([toGlobalId('Post', 33), toGlobalId('Post', 38)]);
  expect(data.users.edges[1].node.id).toBe(toGlobalId('User', 2));
  expect(
    data.users.edges[1].node.posts.edges.map((edge) => edge.node.id)
  ).toEqual([toGlobalId('Post', 1), toGlobalId('Post', 50)]);
});

test('can handle deeply nested pagination', async () => {
  const query = `{
    users(first: 1) {
      edges {
        node {
          posts(first: 2) {
            edges {
              node {
                comments(first: 3) {
                  total
                  pageInfo {
                    hasNextPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      id,
                      body
                      author { fullName }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const comments = data.users.edges[0].node.posts.edges[0].node.comments;
  expect(comments.pageInfo).toEqual({
    hasNextPage: true,
    startCursor: offsetToCursor(0),
    endCursor: offsetToCursor(2),
  });
  expect(comments.edges.length).toBe(3);
  expect(comments.edges[0]).toEqual({
    cursor: offsetToCursor(0),
    node: {
      id: toGlobalId('Comment', 18),
      body:
        "bypassing the hard drive won't do anything, we need to back up the primary EXE bandwidth!",
      author: {
        fullName: 'Coleman Abernathy',
      },
    },
  });
  expect(comments.edges.last().cursor).toBe(comments.pageInfo.endCursor);
});

test('handle a connection type with a many-to-many', async () => {
  const query = `{
    user(id: 2) {
      following(first: 2, after:"${offsetToCursor(0)}") {
        pageInfo {
          hasNextPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            friendship
            intimacy
            closeness
            fullName
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.user.following.pageInfo).toEqual({
    hasNextPage: true,
    startCursor: offsetToCursor(1),
    endCursor: offsetToCursor(2),
  });
  expect(data.user.following.edges).toEqual([
    {
      node: {
        id: toGlobalId('User', 2),
        fullName: 'Hudson Hyatt',
        friendship: 'acquaintance',
        intimacy: 'acquaintance',
        closeness: 'acquaintance',
      },
    },
    {
      node: {
        id: toGlobalId('User', 3),
        fullName: 'Coleman Abernathy',
        friendship: 'acquaintance',
        intimacy: 'acquaintance',
        closeness: 'acquaintance',
      },
    },
  ]);
});

test('filtered pagination at the root', async () => {
  const query = `{
    users(search: "c%i") {
      edges {
        node {
          fullName
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data).toEqual({
    users: {
      edges: [
        {
          node: {fullName: 'Alivia Waelchi'},
        },
        {
          node: {fullName: 'Ocie Ruecker'},
        },
      ],
    },
  });
});

test('filtering on one-to-many-nested field', async () => {
  const query = `{
    user(id: 1) {
      posts(search: "ad") {
        edges {
          node {
            body
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.user.posts.edges).toEqual([
    {
      node: {
        body: [
          'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
          'Deserunt nemo pariatur sed facere accusantium quis.',
          'Nobis aut voluptate inventore quidem explicabo.',
        ].join(' '),
      },
    },
    {
      node: {
        body: [
          'Incidunt quibusdam nulla adipisci error quia.',
          'Consequatur consequatur soluta fugit dolor iure.',
          'Voluptas accusamus fugiat assumenda enim.',
        ].join(' '),
      },
    },
  ]);
});

test('should handle emptiness', async () => {
  const query = `{
    user(id: 6) {
      following {
        edges {
          node {
            id
          }
        }
      }
      posts {
        edges {
          node {
            id
            comments {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      following: {
        edges: [],
      },
      posts: {
        edges: [],
      },
    },
  };
  expect(expected).toEqual(data);
});

test('should handle a post without an author', async () => {
  const query = `{
    node(id: "${toGlobalId('Post', 19)}") {
      id
      ... on Post {
        body
        author {
          id
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    node: {
      id: toGlobalId('Post', 19),
      body: 'Fugit error et. Unde in iure.',
      author: null,
    },
  };
  expect(expected).toEqual(data);
});

test('should handle a "where" condition on a one-to-many paginated field', async () => {
  const query = `{
    users(first: 1) {
      edges {
        node {
          ...info
        }
      }
    }
  }

  fragment info on User {
    id
    fullName
    comments(first: 4, active: false, after: "${offsetToCursor(0)}") {
      total
      edges {
        node {
          id
          archived
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.edges.length).toBe(1);
  expect(data.users.edges[0].node.fullName).toBe('Alivia Waelchi');
  const comments = data.users.edges[0].node.comments.edges.map((edge) => ({
    id: parseInt(fromGlobalId(edge.node.id).id, 10),
    archived: edge.node.archived,
  }));
  expect(data.users.edges[0].node.comments.total).toBe(47);
  const expected = [
    {
      id: 3,
      archived: false,
    },
    {
      id: 4,
      archived: false,
    },
    {
      id: 12,
      archived: false,
    },
    {
      id: 22,
      archived: false,
    },
  ];
  expect(expected).toEqual(comments);
});

test('should handle "where" condition on main table of many-to-many relation', async () => {
  const query = `{
    user(id: 3) {
      fullName
      following(intimacy: acquaintance) {
        edges {
          node {
            id
            fullName
            intimacy
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      fullName: 'Coleman Abernathy',
      following: {
        edges: [
          {
            node: {
              id: toGlobalId('User', 4),
              fullName: 'Lulu Bogisich',
              intimacy: 'acquaintance',
            },
          },
        ],
      },
    },
  };
  expect(expected).toEqual(data);
});

test('should handle order columns on the main table', async () => {
  const query = `{
    user(id: 2) {
      fullName
      following(first: 2, sortOnMain: true, after: "${offsetToCursor(0)}") {
        edges {
          node {
            id
            fullName
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      fullName: 'Hudson Hyatt',
      following: {
        edges: [
          {
            node: {
              id: toGlobalId('User', 1),
              fullName: 'Alivia Waelchi',
            },
          },
          {
            node: {
              id: toGlobalId('User', 2),
              fullName: 'Hudson Hyatt',
            },
          },
        ],
      },
    },
  };
  expect(expected).toEqual(data);
});

test('should handle order columns on the junction table', async () => {
  const query = `{
    user(id: 2) {
      fullName
      following(first: 2, sortOnMain: false, after: "${offsetToCursor(0)}") {
        edges {
          node {
            id
            fullName
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      fullName: 'Hudson Hyatt',
      following: {
        edges: [
          {
            node: {
              id: toGlobalId('User', 2),
              fullName: 'Hudson Hyatt',
            },
          },
          {
            node: {
              id: toGlobalId('User', 3),
              fullName: 'Coleman Abernathy',
            },
          },
        ],
      },
    },
  };
  expect(expected).toEqual(data);
});

test('should handle an interface type', async () => {
  const query = `{
    user(id: 1) {
      writtenMaterial(first: 3) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            body
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    pageInfo: {
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: 'YXJyYXljb25uZWN0aW9uOjA=',
      endCursor: 'YXJyYXljb25uZWN0aW9uOjI=',
    },
    edges: [
      {
        node: {
          id: 'Q29tbWVudDox',
          body:
            'Try to input the RSS circuit, maybe it will copy the auxiliary sensor!',
        },
      },
      {
        node: {
          id: 'UG9zdDoy',
          body: [
            'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
            'Deserunt nemo pariatur sed facere accusantium quis.',
            'Nobis aut voluptate inventore quidem explicabo.',
          ].join(' '),
        },
      },
      {
        node: {
          id: 'UG9zdDoz',
          body: [
            'Qui provident saepe laborum non est. Eaque aut enim officiis deserunt.',
            'Est sed suscipit praesentium et similique repudiandae.',
            'Inventore similique commodi non dolores inventore dolor est aperiam.',
          ].join(' '),
        },
      },
    ],
  };
  expect(expected).toEqual(data.user.writtenMaterial);
});
