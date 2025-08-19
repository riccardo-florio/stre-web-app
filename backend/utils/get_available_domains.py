import requests
import json
from urllib.parse import urlparse

def get_available_domains():
    """
    Fetches the domains.json file from the StreamingCommunity GitHub repository
    and extracts the list of available domains.

    Returns:
        list: A list of available domain names (hostnames).
              Returns an empty list if the request fails or the data
              cannot be processed.
    """
    domains_url = "https://raw.githubusercontent.com/Arrowar/StreamingCommunity/refs/heads/main/.github/.domain/domains.json"
    domains = []

    try:
        response = requests.get(domains_url, timeout=10, verify=False)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        
        site_data = response.json()
        
        if not isinstance(site_data, dict):
            return []

        for site_info in site_data.values():
            full_url = site_info.get("full_url")
            if full_url:
                hostname = urlparse(full_url).hostname
                if hostname:
                    domains.append(hostname)

        # Return a list of unique domains
        return sorted(list(set(domains)))

    except requests.exceptions.RequestException:
        return []
    except json.JSONDecodeError:
        return []