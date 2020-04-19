// @ts-check
const CosmosClient = require('@azure/cosmos').CosmosClient
const debug = require('debug')('questionList:questionDao')

// For simplicity we'll set a constant partition key
const partitionKey = '0'
class PostDao {
  /**
   * Manages reading, adding, and updating Tasks in Cosmos DB
   * @param {CosmosClient} cosmosClient
   * @param {string} databaseId
   * @param {string} containerId
   */
  constructor (cosmosClient, databaseId, containerId) {
    this.client = cosmosClient
    this.databaseId = databaseId
    this.collectionId = containerId
    this.containerId = containerId

    this.database = null
    this.container = null
  }

  async init () {
    debug('Setting up the database...')
    const dbResponse = await this.client.databases.createIfNotExists({
      id: this.databaseId
    })
    this.database = dbResponse.database
    debug('Setting up the database...done!')
    debug('Setting up the container...')
    const coResponse = await this.database.containers.createIfNotExists({
      id: this.collectionId
    })
    this.container = coResponse.container
    debug('Setting up the container...done!')
  }

  async changeQnAcontainer(language){
      if (language === 'English')
      {
        this.collectionId = this.containerId
      }
      else {
        this.collectionId = this.containerId + "_" + language
      }
      const coResponse = await this.database.containers.createIfNotExists({
        id: this.collectionId
      })
      this.container = coResponse.container
      return 'ok'
  }


  async find (querySpec) {
    debug('Querying for items from the database')
    if (!this.container) {
      throw new Error('Collection is not initialized.')
    }
    const { resources } = await this.container.items.query(querySpec).fetchAll()
    return resources
  }

  async addItem (item) {
    debug('Adding an item to the database')
    item.date = Date.now()
    item.answered = !!(item.answers)
    const { resource: doc } = await this.container.items.create(item)
    return doc
  }

  async addItems (items) {
    debug('Adding an item to the database')
    Promise.all(items.map(async (item) => {
      item.date = Date.now()
      item.answered = !!(item.answers)
      const { resource: doc } = await this.container.items.create(item)
    }))
    return 'ok'
  }

  async updateItem (item) {
    debug('Update an item in the database', item, item.id)
    const doc = await this.getItem(item.id)
    debug('getting an item in the database', doc)
    let answers = doc.answers || []
    answers.concat((item.answers || []))
    doc.answers = item.answers
    doc.answered = !!(item.answers)
    doc.sources = item.sources
    doc.youtubeLinks = item.youtubeLinks

    const { resource: replaced } = await this.container
      .item(item.id)
      .replace(doc)
    return replaced
  }
  async editAnswers (item) {
    debug('Update an item in the database', item, item.id)
    const doc = await this.getItem(item.id)
    debug('getting an item in the database', doc)
    doc.answers = item.answers
    doc.answered = !!(item.answers)

    const { resource: replaced } = await this.container
      .item(item.id)
      .replace(doc)
    return replaced
  }

  async reportQuestion (itemId) {
    debug('likeIncrease an item in the database', itemId)
    const doc = await this.getItem(itemId)
    debug('likeIncrease an item in the database', doc)

    doc.flagIssue = (doc.flagIssue || 0) + 1

    const { resource: replaced } = await this.container
      .item(itemId)
      .replace(doc)
    return replaced
  }

  async likeIncrease (itemId) {
    debug('likeIncrease an item in the database', itemId)
    const doc = await this.getItem(itemId)
    debug('likeIncrease an item in the database', doc)

    doc.like = (doc.like || 0) + 1

    const { resource: replaced } = await this.container
      .item(itemId)
      .replace(doc)
    return replaced
  }

  async getItem (itemId) {
    debug('Getting an item from the database')
    const { resource } = await this.container.item(itemId).read()
    return resource
  }

  async deleteItem (itemId) {
    debug('Delete an item from the database', itemId)
    const doc = await this.getItem(itemId)
    const result = await this.container.item(itemId).delete()
    console.log(result)
    return result
  }
}

module.exports = PostDao
