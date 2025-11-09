---
title: "Revolutionizing Search with AI: Diving Deep into Semantic Search"
meta_title: "Revolutionizing Search with AI: Diving Deep into Semantic Search"
description: "Today's AI, powered by machine learning algorithms, has introduced us to semantic search. Explore how we combined Pinecone and OpenAI to create intelligent, user-friendly AI experiences and unravel the code that powers our demo application."
date: 2023-09-12T00:00:00Z
image: "assets/cover.png"
image_credits: "QED42"
categories: ["BizTech", "AI"]
author: "Alphons Jaimon"
tags: ["AI", "Semantic Search", "Pinecone", "OpenAI", "Vector Database", "Rust", "Machine Learning", "GPT-3"]
series_id: "revolutionizing-search-with-ai"
series_name: "Revolutionizing Search with AI"
series_order: 2
draft: false
---

Today's AI, powered by machine learning algorithms, has introduced us to semantic search. Essentially, semantic search interprets queries in a more human way by not just reading the keywords we type but also understanding the context, emotions, and intent behind our queries.

In our [first blog](https://www.qed42.com/insights/revolutionizing-search-with-ai-semantic-search-and-rag) in the semantic search series, we discussed how it can transform how we search. We also presented a demo application that we built to experiment with semantic search.

In this blog, we will explore a combination of Pinecone and OpenAI which are emerging as one of the key players in creating intelligent, user-friendly AI experiences. We'll also [unravel the code](https://www.qed42.com/insights/a-complete-guide-to-testing-ai-and-ml-applications) that powers our demo application and illustrate how [AI](https://www.qed42.com/services/more-services/ai-ml) is revolutionizing data search.

## Our approach to building the solution

We are moving away from traditional keyword-based searches towards searches that grasp the purpose and context behind our query. A key element enabling this smarter search is the integration of embedding models within Large Language Models (LLMs).

These models create vector embeddings that represent data in a multi-dimensional way, which helps in understanding content on a deeper level.

### Tackling challenges with the right tools

While the potential of semantic search is impressive, there are some challenges in making it work effectively. These challenges include handling a robust infrastructure, reducing the time it takes to get search results, and keeping data up-to-date to ensure it remains relevant and useful.

However, when we have the right tools in place, these challenges become much easier to handle. An optimized vector database, for example, enhances the user experience by reducing delays and enabling real-time updates to the search results. It means we no longer have to choose between fast query responses and keeping our data current, resulting in a smoother and more efficient search experience.

### How vector databases enhance semantic search

In semantic search, a vector database plays a crucial role as a storage hub for data embeddings. These embeddings capture the intricate contextual nuances of data.

When we perform a search query, instead of just matching words, we're looking out for vectors that carry similar meanings. This action not only sharpens the relevance of search results but also tailors them to fit the context. It proves beneficial in various scenarios, such as:

- **Precise information retrieval**: It helps teams to precisely locate specific internal data or knowledge without sorting through irrelevant information.
- **User-friendly applications**: It fine-tunes search results to match individual queries and elevates user engagement.
- **Enhanced data integration**: It amplifies search capabilities for large user bases by combining insights from diverse data sources.
- **Personalized recommendation systems**: Users receive suggestions closely aligned with their search history and preferences, making their experience more personal.
- **Detecting anomalies in data streams**: It assists in identifying and flagging outlier data or information that significantly deviates from established patterns, ensuring data quality and consistency.
- **Streamlined content classification**: It automates the grouping and labeling of data based on similarities, simplifying data management and utilization.

### Why we chose Pinecone as our vector store

While looking for the right solution to seamlessly implement semantic search, we needed something that could easily work with our systems.

Pinecone stood out as a great choice, thanks to its user-friendly REST API. Apart from being easy to integrate, Pinecone provides:

- Extremely fast search results, even when dealing with huge amounts of data.
- Ability to update our existing data points in real-time, ensuring that we always have the latest information at our fingertips.
- A fully managed platform, so we can focus on using it rather than dealing with maintenance.
- Flexibility in terms of hosting options, including platforms like [GCP](https://www.pinecone.io/blog/pinecone-gcp-marketplace/), [Azure](https://www.pinecone.io/blog/azure/), and [AWS](https://www.pinecone.io/blog/pinecone-aws-marketplace/).

### Selecting OpenAI as our embedding service

To enhance the efficiency and precision of our semantic search capabilities, selecting the right embedding service was important.

We found OpenAI's Embedding API to be an ideal choice for achieving unmatched contextual understanding in data processing.

Here's why we opted for OpenAI:

- **Deep text understanding**: OpenAI's embedding service is known for its ability to understand text deeply, making it skilled at finding important patterns and connections in large datasets (powered by the advanced GPT-3 model).
- **Easy integration**: OpenAI's well-documented API seamlessly fits into our existing systems, making it simple to add advanced search features. It's a quick choice for trying out new ideas.
- **Continuous improvement**: OpenAI is committed to making its services better over time. It means we can expect regular updates and enhancements, ensuring our search capabilities stay at the cutting edge of technology.

### Opting for Rust as our backend API

To enhance our backend infrastructure, selecting the right programming language is crucial, but not necessarily restrictive.

Rust stood out as a great option, but it's not a strict requirement. Languages like JavaScript, Python, or any language capable of making cURL requests and handling data can work just fine.

However, there were some compelling reasons that made us choose Rust, especially as we explore Rust-based libraries for near real-time LLM inference on cost-effective hardware, which we'll discuss in a future instalment of this series.

Here's why Rust was an excellent choice for our API development:

- **Speed:** Rust is known for compiling efficient machine code, delivering performance similar to languages like C and C++. This speed makes it a strong choice for high-throughput APIs, although it's important to mention that our current reliance on a third-party API presents a challenge in achieving response times under 150 ms.
- **Concurrency:** Rust's ability to prevent data conflicts in concurrent programming with its skill in managing asynchronous tasks is very useful when handling many API requests happening simultaneously.
- **Memory Safety:** Rust proactively detects common errors like trying to access non-existent data, reducing crashes and security vulnerabilities during the coding process. It also works seamlessly with tools like the rust-analyzer plugin in VS Code, making debugging and development smoother.
- **Compatibility:** Rust works well with C libraries, making it easy to directly use functions from these libraries. This provides flexibility when integrating with existing systems.
- **Community and Ecosystem:** Rust benefits from a growing library collection and an active community. It's becoming a central hub for strong tools needed to create web services and APIs. The fact that enthusiasts have creatively made LLMs work with Rust, highlights it as a quick and capable option for more experiments.

## Streamlining data and AI embeddings on Pinecone

In this section, we'll walk you through the process of collecting data, generating AI embeddings using the OpenAI Embedding API, and conducting semantic search experiments within the Pinecone Vector Database.

OpenAI models, like GPT-3, have been trained on a vast and diverse collection of text data. They excel at capturing complex language patterns and understanding context. These models transform each word or phrase into a high-dimensional vector. This process, known as embedding, captures the meaning of the input in a way that's easy for systems to understand.

For example, the word "lawyer" might be represented as a 1536-dimensional vector (using the 2nd gen OpenAI embedding API model text-embedding-ada-002, which is based on GPT-3). Each dimension in this vector captures a different aspect of the word's meaning.

These embeddings play a crucial role in semantic search. When a user enters a search query, the AI model creates an embedding of that query.

This embedding is then sent to the vector database, such as Pinecone in our case, which finds and retrieves the most similar vectors, essentially providing the most contextually relevant results.

Think of it as translating human language into a format that machines can easily grasp and work with effectively. By generating these embeddings, OpenAI models enable us to achieve more precise and context-aware search results, a significant advancement over traditional keyword-based search methods.

Let's take an example: imagine a user searching for "rights of a tenant in Illinois." With a traditional keyword-based search, you'd get documents containing those exact words. But when we use an AI model to create embeddings, it understands the real meaning – that the user is looking for information about tenant rights in Illinois.

The system then fetches relevant results, even if they don't use the exact phrasing of the query but discuss the same idea. This could mean providing a comprehensive guide to tenant rights, mentioning a relevant court case in Illinois, or sharing a related law statute. In the end, it gives the user a more detailed and helpful response.

It's the combination of OpenAI's Embedding API and Pinecone's efficient vector search that makes this enhanced, contextually-aware search experience possible.

## Implementation of our solution

Please note that this experiment was tailored for a specific website.

Here's what we did:

### Step 1

**Data Cleanup and Preparation:** Our first step involved cleaning up the data and making sure it was compatible with Pinecone. We used Python for data preparation since it is simple for handling large datasets.

**Data Collection**: We collected a CSV file with over 1600 rows, all related to legal assistance from the Illinois Legal Aid Online site.

**Pinecone Database Requirements**: Pinecone needs data to have three specific columns: id, vectors, and metadata. We ensured our data met these requirements for seamless integration.

Before we proceed to create the vector, let's organize the data. Column names have been shortened for data privacy.

**Note:** We are not using metadata in our current experiment. It's primarily used for filtering and faster querying, or as a means to transmit data while querying in a different environment. In our case, Pinecone Query API will perform more efficiently without the inclusion of metadata.

```python
# Setup pinecone structured data
from slugify import slugify

def create_doc_index(row):
    """
    An apply function to alter the content.

    Creates a new column called "id".
    Which contains the slugified title.

    Eg. "hello world" will be 'hello-world'
    """
    row['id'] = slugify(row['Title'])
    return row

def create_data(row):
    """
    An apply function to alter the content.

    Creates a new column called "data".
    Which contains the following as a single text string:
    '
        Title: {Title column value},
        Description: {Content description column value},
        ...
        Content: {Content column value}
    '
    """
    row['data'] = f"Title: {row['Title']}, Description: {row['Content description']}, Content: {row['Content block']}"
    return row

def create_metadata(row):
    """
    An apply function to alter the content.

    Creates a new column called "metadata".
    Which contains the following as a dict:
    {
        'Title': {Title column value},
        ...
        'Legal category (select all that apply)': {Legal category (select all that apply) column value},
    }
    """
    row['metadata'] = {
        'Title': str(row['Title'] if row['Title'] else ''),
        ...
        'Legal category (select all that apply)': str(row['Legal category (select all that apply)'] if row['Legal category (select all that apply)'] else ''),
    }
    return row
```

Here's an overview of what the data looks like after we completed the initial cleanup and processing. We applied the functions we created earlier to each row in the database.

Next up is the generation of AI embeddings for the vector database. Please note that you'll need OpenAI API keys for this step.

```python
def embeddings(text):
    # Make API request to OpenAI's Embedding endpoint
    response = openai.Embedding.create(
        model="text-embedding-ada-002",  # The model to use for the AI embeddings
        input=text,  # The text to embed
    )
    # Retrieve and return the AI embedding from the response.
    return response['data'][0]['embedding']

# Generate the first 10 components of the AI embedding for "Hello"
embeddings("Hello")[:10]
```

For example, when we input the test string "hello," we receive the following set of embeddings as output.

```
[-0.021849708631634712,
 -0.007138177752494812,
 -0.028344865888357162,
 -0.02456468529999256,
 -0.023603402078151703,
 0.028864478692412376,
 -0.012243371456861496,
 -0.0028562454972416162,
 -0.00829431600868702,
 -0.00539747579023242]
```

We apply this AI embedding function to all the rows in our dataset. You can see the vector column in the image below.

Now, on to the final step - uploading this data to Pinecone. We are using the gRPC protocol provided by the Pinecone library, which makes this upload faster, taking less than 15-30 seconds in total.

```python
# Creating the Pinecone index only if it does not exist
if index_name not in pinecone.list_indexes():
    pinecone.create_index(
        name=index_name,
        dimension=1536,  # specifying the dimension for the index vectors
        metric='cosine'  # specifying the metric for vector comparison
    )

# Creating an interface to interact with the Pinecone index
index = pinecone.GRPCIndex("hybrid-legal-doc-search")

# Inserting/updating vectors in the index from our DataFrame 'ddf'
index.upsert_from_dataframe(ddf, batch_size=100)
```

Take a peek at the index statistics using

```python
index.describe_index_stats()

{'dimension': 1536,
 'index_fullness': 0.0,
 'namespaces': {'': {'vector_count': 1697}},
 'total_vector_count': 1697}
```

Lastly, when querying in Pinecone, we need to provide the AI embeddings to get the relevant results.

You might wonder why we're generating AI embeddings before uploading data to Pinecone and prior to querying. The reason is that embeddings can be created using various models, and they are not always compatible with one another.

Different models like Bert and simple Word2Vec, among others, can be used to perform the same task, and they produce embeddings that may not work interchangeably.

This is why it's important to have the embeddings prepared in advance to ensure a smooth and consistent search experience.

```python
# Querying the Pinecone index with the query vector
# 'top_k' indicates we want the top 3 results and 'include_metadata' set to False indicates we don't want additional metadata
xc = index.query(embeddings("family and legal advice"), top_k=3, include_metadata=False)

print(xc)

# Output:
{'matches': [{'id': 'someone-called-dcfs',
              'score': 0.8318765,
              'sparse_values': {'indices': [], 'values': []},
              'values': []},
             {'id': 'divorce-and-parental-responsibilities',
              'score': 0.81308925,
              'sparse_values': {'indices': [], 'values': []},
              'values': []},
             {'id': '7-things-i-can-do-to-safely-talk-to-my-lawyer',
              'score': 0.81211287,
              'sparse_values': {'indices': [], 'values': []},
              'values': []}]
```

### Step 2

Next, we'll create an API that can manage both AI embedding and querying processes seamlessly.

Here is an overview of the backend development process.

Here is the code for Rust backend that couples our Pinecone and OpenAI APIs together.

```rust
// The "q" route handeler
pub async fn query_q_api(
    // The query
    query: HashMap<String, String>,
    // Web client
    client: Arc<Client>,
    // LRU Cache
    q_cache: Arc<Mutex<LruCache<String, Vec<ResponseMatch>>>>,
) -> Result<impl warp::Reply, warp::Rejection> {

    // Extracting and decoding the query parameter 'q'
    let input = decode(query.get("q").unwrap_or(&String::new())).unwrap();
    let q_cache_key = input.clone();

    // Attempting to get a response from the cache if it exist
    {
        let mut q_cache = q_cache.lock().await;
        if let Some(cached_response) = q_cache.get(&q_cache_key) {
            // If a response is found in the cache return the cached response
            return Ok(warp::reply::json(&cached_response.clone()));
        }
    }

    // If no response was found in the cache, fetch new data
    let response_matches = fetch_new_data(client, input).await;

    // Put the new data into the cache for future use
    {
        let mut q_cache = q_cache.lock().await;
        q_cache.put(q_cache_key, response_matches.clone())
    }

    // return the fetched data as the response
    Ok(warp::reply::json(&response_matches))
}
```

For our demo, we've implemented a short-term, in-memory cache to prevent unnecessary API calls.

However, in the future, we aim to introduce an on-disk cache and implement local semantic search capabilities for queries with similar meanings. It will enhance the efficiency and responsiveness of our system down the line.

```rust
// Creating a shared LRU cache for "q" route and defining the route
    let q_cache = Arc::new(Mutex::new(LruCache::<String, Vec<ResponseMatch>>::new(CACHE_SIZE)));
    let q_route = warp::path("q")
        .and(warp::query::<HashMap<String, String>>())
        .and(with_client(client.clone()))
        .and(with_q_cache(q_cache.clone()))
        .and_then(query_q_api);
```

Next, we have a helper function 'fetch_new_data'. This function handles calls to both the OpenAI and Pinecone APIs, ensuring a smooth flow of data retrieval and processing.

```rust
// This function fetches new data from OpenAI and Pinecone APIs
pub async fn fetch_new_data(client: Arc<Client>, input: String) -> Vec<ResponseMatch>

    // Getting the AI embeddings from OpenAI API
    let openai_resp = get_openai_response(&client, input, &openai_org_id, &openai_api_key).await;
    let embedding = &openai_resp.data.get(0).unwrap().embedding;

    // Getting the top matches from Pinecone API
    let pinecone_resp = get_pinecone_response(&client, embedding.to_vec(), &pinecone_api_key, &pinecone_endpoint).await;

    // Converting the Pinecone response to a list of ResponseMatch and returning it
    return pinecone_resp.matches.into_iter().map(|match_| {
        let metadata = match_.metadata.unwrap_or(json!({}));
        ResponseMatch {
            id: match_.id,
            score: match_.score,
            title: metadata.get("Title").unwrap_or(&json!("")).as_str().unwrap_or("").to_string(),
            description: metadata.get("Description").unwrap_or(&json!("")).as_str().unwrap_or("").to_string(),
            url: metadata.get("url").unwrap_or(&json!("")).as_str().unwrap_or("").to_string(),
        }
    }).collect::<Vec<ResponseMatch>>();
}

// This function sends a POST request to the OpenAI API to get the AI embeddings for the input text
pub async fn get_openai_response(client: &Client, input: String, openai_api_key: &str, openai_org_id: &str) -> OpenAIResponse {

    // Sending the request to OpenAI API and getting the response
    let response = client
        .post("https://api.openai.com/v1/embeddings")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", openai_api_key))
        .header("OpenAI-Organization", format!("{}", openai_org_id))
        .json(&json!({
            "input": input,
            "model": "text-embedding-ada-002"
        }))
        .send()
        .await.unwrap()
        .json()
        .await.unwrap();

    response
}

// This function sends a POST request to the Pinecone API to get the top matches for the input embedding
pub async fn get_pinecone_response(client: &Client, embedding: Vec<f64>, pinecone_api_key: &str, pinecone_endpoint: &str) -> PineconeResponse {

    // Sending the request to Pinecone API and getting the response
    let response = client
        .post(pinecone_endpoint)
        .header("Api-Key", pinecone_api_key)
        .header("Content-Type", "application/json")
        .json(&json!({
            "vector": embedding,
            "topK": 3,
            "includeValues": false,
            "includeMetadata": true
        }))
        .send()
        .await.unwrap()
        .json()
        .await.unwrap();

    response
}
```

Currently, we're experiencing significant delays with both the Pinecone and OpenAI APIs. Our goal is to cut down this delay further by exploring on-premises solutions.

It involves considering options like Bert for AI embedding and Milvus or similar open-source vector databases that can be used locally.

With the API components in place, take a look at what the demo frontend has to offer.

Here's a simple "useEffect" method within our React app. It's responsible for updating the search results in real-time as the user types in their query.

```javascript
// searchText is the text from the search box.
useEffect(() => {
    // Check in the client-side cache if found set the results
    if (searchCache.current[searchText]) {
      setResults(searchCache.current[searchText]);
    } else {
        // When the user enters more than 2 letters the fetching process starts
      if (searchText.length > 2) {
            // Defining the fetch function
        const fetchData = async () => {
          try {
                // Calling our previously developed Rust API
            const response = await fetch(
              process.env.REACT_APP_BASE_API_URL + `/q?q=${encodeURIComponent(searchText)}`
            );
            const data = await response.json();
                // Store to user cache, just in case the user searches for the same Query
            searchCache.current[searchText] = data;
                // Set results
            setResults(data);
          } catch (error) {
            console.error("Error fetching data:", error);
          }
        };
            // Caling the fetch function
        fetchData();
      }
    }
    // monitoring the searchText var for changes
  }, [searchText]);
```

## What's next

We tried the RAG approach which involved feeding the results into a ChatGPT-like system, ultimately providing users with more personalized results without the need to navigate through numerous blog pages. We employed interesting strategies and encountered some challenges with this approach. You can delve deeper into our journey by checking out our [next blog](https://www.qed42.com/insights/revolutionizing-search-with-ai-rag-for-contextual-response) in this series.

We are soon planning to launch a platform where you can play with all these experiments. As we move forward, our focus is on matching the right technology with the needs of our customers. The field of semantic search and vector similarity is full of exciting possibilities, such as creating recommendation engines based on similarity.

Right now, we're actively working on several Proof of Concepts (PoCs), where we're balancing speed and accuracy depending on the specific application. We're exploring various models, including BERT-based ones and more, beyond the standard 'text-embedding-ada-002.'

We're also attentive to our customers' preferences for platforms like Azure or GCP. To meet these preferences, we're adjusting our approach to include models recommended by these providers, aiming to create a versatile system that can effectively serve different use cases, budgets, and unique requirements.

---

*Originally published on [QED42](https://www.qed42.com/insights/revolutionizing-search-with-ai-diving-deep-into-semantic-search) on September 12, 2023*
