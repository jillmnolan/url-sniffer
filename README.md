# URL Sniffer

[![NPM](https://nodei.co/npm/url-sniffer.png?compact=true)](https://nodei.co/npm/url-sniffer/)

Do you have a URL that stopped working that maybe looks something like this?

`https://maxcdn.bootstrapcdn.com/bootstrap/min/3.3.7/js/bootstrap.min.js`

Use URL Sniffer to find the problem with it.

![Sample Output](https://raw.githubusercontent.com/alexbbt/url-sniffer/master/images/bootstrap.png)

## Installation

``` bash
npm install url-sniffer --global
```

## Usage

```Bash

Usage: urls [options]

Options:

  -h, --help            output usage information
  -V, --version         output the version number
  -u, --url <url>       URL to parse
  -d, --delineator [/]  string to split url on
  -s, --single          Include single segments, i.e. "www" or "com"
  -b, --base            Modify the base url, i.e. try "www.com" when sniffing "www.google.com"
  -D, --diff            Show the difference in the URL

```

## Contributing

1. Fork it on Github [https://github.com/alexbbt/url-sniffer](https://github.com/alexbbt/url-sniffer)
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D
