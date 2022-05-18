# Mighty Starter

<img src="assets/logo.png" height="128" /> + <img src="assets/qdrant.png" height="128" />

This project provides a complete and working semantic search application, using [Mighty Inference Server](https://max.io), [Qdrant Vector Search](https://qdrant.tech), and an example Node.js express application.

## Background

Getting started with vector search or semantic search is an enormous undertaking.  It can take weeks or months to assemble various ad-hoc technologies before you have something that can actually run in production.  Also, much of this tooling and knowledge is scattered around and it is difficult to know what to look for.

A vector search project involves understanding and tuning at all layers of the following:

- Content acquisition and structure
- Base model selection and testing
- Inference runtime and model conversion
- Vector search engine choice and config
- Extract-transform-load) glue
- Search UI and API
- Docker composition

This project was created as a starter kit for all of the above, and provides a forkable Docker compose that you can quickly adapt to your own needs quickly.

You can use it to scrape a website and have a complete demo up and running in minutes, or use the provided example content from https://outdoors.stackexchange.com (CC BY 4.0).

# How to use it

## Prerequisites

You'll need docker and a recent version of node.js (tested on v16).

N.B. there is zero Python required! The entire stack runs on Node and Rust technologies, and is very lightweight and fast.

## Installation

Simply clone this repository, then start the servers with `docker compose up` (or `docker compose up -d` to run in detached mode).

## Example Outdoors content

With the docker systems running, you can infer and index the outdoors content by simply running `./index.sh`

## Index a website from a sitemap!

It's also possible to scrape and index any website that has a sitemap.xml file available.  Simply run the following:
`./website.sh [name] [https://example.com/sitemap.xml]` (where `[name]` is any name you give and replace the example sitemap with your own.

# How fast is it?

Once indexed and running, the search is very fast. Requests return on average in about 20 to 50ms on a recent laptop.

Inference can take a while, but can be accelerated by using a Mighty cluster and mighty-batch.  See this post for more details: https://max.io/blog/encoding-the-federal-register.html 