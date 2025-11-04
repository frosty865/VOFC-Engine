# GPU Optimization Guide for VOFC Engine

## Current Status

The VOFC Engine uses Ollama for LLM inference. Ollama automatically detects and uses GPU if available, but there are several optimizations we can make.

## 1. Check GPU Availability

```powershell
# Check if GPU is detected
python -c "import pynvml; pynvml.nvmlInit(); print('GPU:', pynvml.nvmlDeviceGetName(pynvml.nvmlDeviceGetHandleByIndex(0)).decode())"
```

## 2. Ollama GPU Configuration

### Environment Variables

Set these environment variables to optimize GPU usage:

```powershell
# Number of GPU layers to offload (more = faster, but uses more VRAM)
$env:OLLAMA_GPU_LAYERS = "35"  # Adjust based on your GPU VRAM

# Number of GPUs to use (if multiple)
$env:OLLAMA_NUM_GPU = "1"

# CUDA device selection
$env:CUDA_VISIBLE_DEVICES = "0"  # Use first GPU
```

### Model-Level Configuration

Check your model's Modelfile to see GPU layer settings:

```bash
ollama show vofc-engine:latest --modelfile
```

Look for `num_gpu` or `num_gpu_layers` settings.

## 3. Optimal GPU Layer Settings

| GPU VRAM | Recommended Layers | Model Size |
|----------|---------------------|------------|
| 8GB      | 20-30              | 7B models  |
| 12GB     | 30-35              | 7B-13B     |
| 16GB     | 35-40              | 13B-20B    |
| 24GB+    | 40-50              | 20B+       |

## 4. Current Implementation

The `query_ollama()` function in `heuristic_pipeline.py` now:
- Checks for `OLLAMA_GPU_LAYERS` or `OLLAMA_NUM_GPU` environment variables
- Passes `num_gpu` parameter to Ollama API if set
- Falls back to CPU if GPU not available

## 5. Monitoring GPU Usage

Check GPU utilization:

```powershell
# Via Flask health endpoint
curl http://localhost:5000/api/system/health | ConvertFrom-Json | Select-Object -ExpandProperty gpu

# Via nvidia-smi (if installed)
nvidia-smi
```

## 6. Performance Recommendations

1. **Batch Processing**: Process multiple chunks in parallel (if GPU memory allows)
2. **Context Window**: Larger context = more GPU memory usage
3. **Model Quantization**: Use quantized models (Q4, Q5) for better GPU efficiency
4. **Memory Management**: Clear context cache periodically (`ollama rm cache`)

## 7. Troubleshooting

### GPU Not Detected
- Check NVIDIA drivers: `nvidia-smi`
- Verify CUDA installation
- Check Ollama logs for GPU detection messages

### Low GPU Utilization
- Increase `OLLAMA_GPU_LAYERS` to offload more layers
- Reduce batch size if memory constrained
- Check for CPU bottlenecks in data processing

### Out of Memory Errors
- Reduce `OLLAMA_GPU_LAYERS`
- Use smaller model or quantized version
- Process fewer documents concurrently

## 8. Testing GPU Performance

```python
import time
import requests

# Test with GPU
start = time.time()
response = requests.post("http://localhost:11434/api/generate", json={
    "model": "vofc-engine:latest",
    "prompt": "Test prompt",
    "options": {"num_gpu": 35}  # Adjust based on your GPU
})
print(f"Time: {time.time() - start:.2f}s")
```

## 9. Next Steps

1. **Set environment variables** in your `.env` file or system
2. **Monitor GPU utilization** during processing
3. **Adjust GPU layers** based on actual usage and memory
4. **Consider model quantization** for better performance

